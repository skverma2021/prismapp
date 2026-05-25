# Request Lifecycle

**Audience:** Developers who understand the individual layers but want to see how they connect in motion.  
**Purpose:** Trace a single user interaction from browser click to rendered UI, touching every architectural layer once.  
**Example:** The user clicks "Blocks" in the sidebar — `GET /api/blocks?page=1&pageSize=20` is issued.

---

## Slide 1 — Browser to route handler

**Headline:** Every data fetch in PrismApp starts with a Client Component calling `fetch`.

**Talking points:**

1. **User action** — The user navigates to `/blocks`. The page file is `app/(dashboard)/blocks/page.tsx`.
2. **Client Component renders** — The page component is marked `"use client"`. It holds filter and pagination state in `useState` (managed via the `useBrowseState` hook).
3. **Effect fires** — On mount (and whenever filter state changes), a `useEffect` calls `fetch("/api/blocks?page=1&pageSize=20")`.
4. **HTTP request leaves the browser** — This is a standard `GET` request. The browser attaches the session cookie automatically because next-auth set it as `httpOnly; SameSite=lax`.
5. **Next.js routes the request** — The App Router matches `/api/blocks` to `app/api/blocks/route.ts` and calls the exported `GET` function.

**Visual:** Browser box → `app/(dashboard)/blocks/page.tsx` (Client Component) → `fetch()` call → `app/api/blocks/route.ts` (route handler). Session cookie shown as a label on the HTTP arrow.

**Key takeaway:** Client Components own the fetch trigger. Server Components would use `async/await` directly — but browse pages with filters and pagination must be client-side.

---

## Slide 2 — Route handler to database

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

## Slide 3 — Response to rendered table

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
Browser
  │  user navigates to /blocks
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
