# Request Lifecycle

**Audience:** Developers who understand the individual layers but want to see how they connect in motion.  
**Purpose:** Trace the full journey from an unauthenticated first visit, through login, to a single user interaction rendering data — touching every architectural layer once.  
**Example:** A fresh browser hits `localhost:3000`, signs in, then clicks "Blocks" in the sidebar — `GET /api/blocks?page=1&pageSize=20` is issued.

---

## Slide 1 — Pre-login: establishing the session

**Headline:** Before any Block ever renders, the server has already decided whether you're logged in — without the browser asking twice.

**Talking points:**

1. **First request, no cookie** — The browser requests `/`. `app/layout.tsx` runs on the server for every request and calls `await getServerAuthSession()` ([auth.ts](../../auth.ts)). With no session cookie present, this resolves to `null`.
2. **Null session passed down** — The root layout renders `<AppSessionProvider session={null}>{children}</AppSessionProvider>` ([src/lib/auth-session.tsx](../../src/lib/auth-session.tsx)), making `null` available via `useSession()`/`useAuthSession()` to any Client Component without a client-side fetch.
3. **Public page checks again, renders the form** — `app/(public)/page.tsx` independently calls `getServerAppSession()` ([src/lib/server-auth.ts](../../src/lib/server-auth.ts)). Since it's `null`, there's no `redirect("/home")` — the page falls through and renders `<LoginForm />`.
4. **Credentials submitted** — The form posts to NextAuth's Credentials provider. `authorize()` in [auth.ts](../../auth.ts) runs: looks up `db.appUser.findUnique({ where: { email } })` (first real use of `DATABASE_URL` in this flow) and checks the password with `bcrypt.compare`.
5. **Token and session shaped** — On success, the `jwt` callback enriches the token with `userId`, `role`, `displayName`; the `session` callback copies those onto `session.user`. The JWT is encrypted with a key derived from `AUTH_SECRET`.
6. **Cookie set, browser redirected** — NextAuth sets an `httpOnly; SameSite=lax` session cookie and redirects to `/home` (or the original `?next=` target).  `NEXTAUTH_URL` governs the callback/cookie origin used in this step.

   > **Note 1 — who does what.** Next.js's only job here is routing: any request to `/api/auth/*` (including `/api/auth/callback/credentials`, which is what the login form actually POSTs to) is matched to the single catch-all Route Handler (`app/api/auth/[...nextauth]/route.ts`) and handed off. Everything from that point on — validating the POST, calling your `authorize()`, running the `jwt`/`session` callbacks, encrypting the token, building the `Set-Cookie` header, and issuing the redirect response — is NextAuth's internal implementation. PrismApp's own code in [auth.ts](../../auth.ts) only supplies data-shaping callbacks (`authorize`, `jwt`, `session`); it never constructs a cookie or writes a `Set-Cookie` header itself.

   > **Note 2 — where the session lives.** The session is a cookie in the browser's cookie jar, scoped to the origin from `NEXTAUTH_URL` (`http://localhost:3000` locally) — not `localStorage`, not `sessionStorage`, not IndexedDB.
   >
   > - **Name:** `next-auth.session-token` over plain HTTP (local dev); it becomes `__Secure-next-auth.session-token` automatically once NextAuth detects HTTPS (browsers require the `__Secure-` prefix to be paired with the `Secure` attribute).
   > - **Attributes:** `HttpOnly` (unreadable from `document.cookie`/client JS — mitigates XSS token theft), `SameSite=Lax`, `Path=/`, `Secure` in production.
   > - **Value:** PrismApp uses `session: { strategy: "jwt" }` with no database adapter (`prisma/schema.prisma` has no `Session`/`Account`/`VerificationToken` models, and `auth.ts` never imports a Prisma adapter). The cookie's value is therefore the session itself — a JWT containing `userId`, `role`, `displayName`, etc., encrypted with a key derived from `AUTH_SECRET`. There is no server-side session table to look up.7. **Every request after this point is already authenticated** — The dashboard layout ([app/(dashboard)/layout.tsx](../../app/(dashboard)/layout.tsx)) calls `requireServerAppSession({ allowedRoles: [...] })`, which redirects back to `/` if the cookie is missing or the role doesn't qualify. From here on, the cookie — not a fresh login — is what every subsequent request (including the Blocks fetch in Slide 2) relies on.

**Visual:** Browser → `app/layout.tsx` (`getServerAuthSession()` → `null`) → `AppSessionProvider` → `app/(public)/page.tsx` renders `<LoginForm>` → form submit → NextAuth `authorize()` → PostgreSQL (`AppUser` lookup) → encrypted JWT cookie → redirect to `/home`.

**Key takeaway:** The session is established once, server-side, before login, and again validated server-side after login — the browser never has to "ask if it's logged in"; the cookie it already holds answers that on every later request.

---

## Slide 2 — Browser to route handler

**Headline:** Every data fetch in PrismApp starts with a Client Component calling `fetch`.

**Talking points:**

1. **User action** — The user navigates to `/blocks`. The page file is `app/(dashboard)/blocks/page.tsx`.
2. **Client Component renders** — The page component is marked `"use client"`. It holds filter and pagination state in `useState` (managed via the `useBrowseState` hook).
3. **Effect fires** — On mount (and whenever filter state changes), a `useEffect` calls `fetch("/api/blocks?page=1&pageSize=20")`.
4. **HTTP request leaves the browser** — This is a standard `GET` request. The browser attaches the session cookie automatically because next-auth set it as `httpOnly; SameSite=lax`.
5. **Next.js routes the request** — The App Router matches `/api/blocks` to `app/api/blocks/route.ts` and calls the exported `GET` function.

**Visual:** Browser box → `app/(dashboard)/blocks/page.tsx` (Client Component) → `fetch()` call → `app/api/blocks/route.ts` (route handler). Session cookie shown as a label on the HTTP arrow — the same cookie set at the end of Slide 1.

**Key takeaway:** Client Components own the fetch trigger. Server Components would use `async/await` directly — but browse pages with filters and pagination must be client-side.

---

## Slide 3 — Route handler to database

**Headline:** The route handler authenticates, delegates to the service, and never touches the database itself.

**Talking points:**

1. **Auth guard** — `GET` handler calls `requireReadRole(request)` from `src/lib/authz.ts`. This calls `getServerSession()` (next-auth), checks the session is not expired, and verifies the role is at least `READ_ONLY`. Returns `401` if unauthenticated, `403` if insufficient role.
2. **Parameter parsing** — The handler reads `request.nextUrl.searchParams` for `page`, `pageSize`, `description` (search term), and passes them to the service.
3. **Service call** — `blocksService.listBlocks(params)` in `src/modules/blocks/blocks.service.ts` is called. The route handler has no SQL, no Prisma calls — those live only in the service.
4. **Prisma query** — The service calls `db.block.findMany({ where: ..., skip: ..., take: ..., orderBy: ... })` plus `db.block.count({ where: ... })` in parallel via `db.$transaction([...])`.
5. **PostgreSQL executes** — Prisma translates the query to SQL and sends it over the connection pool (`@prisma/adapter-pg`). PostgreSQL returns rows.
6. **Service returns a typed object** — `{ items: Block[], total: number }`.

**Visual:** Route handler box (left) → `requireReadRole()` → service call → `src/modules/blocks/blocks.service.ts` box → `db.$transaction` → Prisma → PostgreSQL cylinder (right). Show SQL flowing left on the return path.

**Key takeaway:** Route handlers are thin: auth → parse → delegate → respond. Business logic and SQL belong in the service.

---

## Slide 4 — Response to rendered table

**Headline:** The JSON response flows back through `fetch`, into state, and React re-renders the table.

**Talking points:**

1. **Service result → route handler** — The handler wraps the service result with `ok(data)` from `src/lib/api-response.ts`, which produces `{ success: true, data: { items: [...], total: N } }`. `NextResponse.json(envelope, { status: 200 })` is returned.
2. **HTTP response reaches the browser** — The browser receives the JSON body. The `fetch` promise resolves.
3. **State update** — The Client Component's `.then(res => res.json())` callback calls `setBlocks(data.items)` and `setTotal(data.total)`. React schedules a re-render.
4. **Table renders** — The component renders a `<table>` (or the shared `DataTable` component) with one `<tr>` per Block. Pagination controls update.
5. **Error path** — If the service throws `HttpError(404)` or `HttpError(409)`, `fromUnknownError()` maps it to `{ success: false, error: { code, message } }` with the correct HTTP status. The Client Component checks `data.success === false` and shows an error notice without crashing.

**Visual:** Route handler → `ok(data)` → `NextResponse.json` → browser `fetch` resolves → `setState` → React re-render → table shown. Show the error path as a dashed arrow: `HttpError` → `fail(...)` → `success: false` → error notice.

**Key takeaway:** The `ok()` / `fail()` envelope is the contract between every route handler and every Client Component. Consistent shape means consistent error handling.

---

## The full picture in one diagram

```
Browser (no session cookie yet)
  │  GET /
  ▼
app/layout.tsx
  │  getServerAuthSession() → null
  ▼
app/(public)/page.tsx
  │  getServerAppSession() → null → renders <LoginForm>
  │  user submits credentials
  ▼
NextAuth Credentials provider (auth.ts)
  │  authorize(): db.appUser.findUnique + bcrypt.compare
  │  jwt/session callbacks shape token → signed with AUTH_SECRET
  ▼
Browser
  │  httpOnly session cookie set, redirected to /home
  │  user navigates to /blocks
  ▼
app/(dashboard)/layout.tsx
  │  requireServerAppSession() ← redirects to / if cookie missing/role insufficient
  ▼
app/(dashboard)/blocks/page.tsx   ("use client")
  │  useEffect → fetch("/api/blocks?page=1&pageSize=20")
  │  session cookie attached automatically
  ▼
app/api/blocks/route.ts           (Route Handler)
  │  requireReadRole(request)     ← 401/403 on failure
  │  parse searchParams
  │  blocksService.listBlocks(params)
  ▼
src/modules/blocks/blocks.service.ts
  │  db.$transaction([findMany, count])
  ▼
Prisma (adapter: @prisma/adapter-pg)
  │  SQL: SELECT ... FROM "Block" WHERE ... LIMIT 20 OFFSET 0
  ▼
PostgreSQL
  │  rows returned
  ▲
  │  Prisma maps rows → typed objects
  ▲
  │  service returns { items, total }
  ▲
  │  route handler: NextResponse.json(ok({ items, total }), { status: 200 })
  ▲
Browser
  │  fetch resolves → setState({ blocks: items, total })
  │  React re-renders → <table> with rows
  ▼
User sees the Blocks table
```
