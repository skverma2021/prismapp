# C-02 — The Next.js App Router

---

## Slide 1 of 3 — Server vs Client: The Fundamental Split

**Headline:** The App Router introduces a split that determines where code runs.

**Talking points:**
- The Next.js Pages Router had one mental model: every page component is a module that exports a default function. Data fetching happened in `getServerSideProps` or `getStaticProps` — separate, bolted on.
- The App Router replaces that model. Now every component is **Server** or **Client**, and that choice is explicit.
- **Server Component**: runs on the server during the request. Has access to the database, file system, environment variables, and auth session. Never ships to the browser — no JavaScript bundle size.
- **Client Component**: marked with `"use client"` at the top of the file. Runs in the browser. Has access to state, effects, event handlers, and browser APIs. Cannot directly access the database.
- The rule of thumb: start with Server Components. Add `"use client"` only when you need interactivity (state, handlers) or browser APIs.

Show this contrast:

```
app/(dashboard)/layout.tsx          ← Server Component (no "use client")
  └─ requireServerAppSession()      ← reads JWT on the server side
  └─ <DashboardShell>               ← renders the shell on the server

app/(dashboard)/blocks/page.tsx     ← Client Component ("use client" at top)
  └─ useState, useEffect            ← browser interactivity
  └─ useBrowseState, useCrudActions ← UI state management
  └─ fetch("/api/blocks")           ← calls the Route Handler over HTTP
```

- Note the design consequence: the **dashboard layout is a Server Component**, so it runs the auth check (`requireServerAppSession`) before any page content is rendered. An unauthenticated user never gets a page — they get a redirect. This is more efficient and more secure than checking auth inside Client Components.
- The layout's auth check is a defensive layer — it prevents rendering private content to unauthenticated users. It does **not** replace the auth check inside the Route Handler (more on that in C-05).

**Visual:** Side-by-side diagram of two trees: Pages Router (page.js + getServerSideProps) vs App Router (Server Component layout + Client Component page). Shade Server-side nodes blue, Client-side nodes green.

**Takeaway:** Default to Server Components. The `"use client"` directive is a deliberate choice to move code to the browser — not the default.

---

## Slide 2 of 3 — Route Handlers: Your API Layer

**Headline:** Route Handlers replace Express controllers without adding a separate server.

**Talking points:**
- In the App Router, API endpoints live in `app/api/` and are defined as files named `route.ts`. Each file exports named functions — `GET`, `POST`, `PATCH`, `DELETE` — corresponding to HTTP methods.
- There is no separate Express server, no separate API project, no `server.js`. The Next.js server is the API server.
- Open `app/api/blocks/route.ts`. Read it aloud and annotate the structure:

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);          // ← auth boundary
    const data = await listBlocks(...);      // ← business logic (service layer)
    return ok(data);                         // ← standard response envelope
  } catch (error) {
    return fail(fromUnknownError(...));      // ← standard error envelope
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request); // ← auth + captures who
    const payload = await request.json();
    const input = parseCreateBlockInput(payload);     // ← input validation
    const data = await createBlock(input, actor);     // ← service call
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(...));
  }
}
```

- This four-step shape — **auth → parse → service → respond** — is the same in every Route Handler in this project. Once a student has read one, they can read all of them.
- Contrast with the dashboard layout: the layout's `requireServerAppSession()` prevents rendering private pages. The Route Handler's `requireReadRole()` / `requireMutationRole()` prevents unauthorized data access. These are two different guards at two different layers — both are needed.

**Visual:** Annotated screenshot of `app/api/blocks/route.ts` with four colored bands: auth (red), parse (yellow), service (blue), respond (green).

**Takeaway:** Every Route Handler follows the same four-step pattern. Deviation from this pattern is a flag for review.

---

## Slide 3 of 3 — Why `proxy.ts` and Not `middleware.ts`

**Headline:** Next.js 16 renamed middleware. This is not a bug — it's where cross-cutting concerns live.

**Talking points:**
- In Next.js versions before 16, cross-cutting middleware (rate limiting, request ID injection, etc.) lived in `middleware.ts` at the project root. The function was exported as `default`.
- In Next.js 16, the file is `proxy.ts` and the function is exported as `proxy`. The behavior is otherwise identical — it runs at the edge, before every matching request, and has access to the request headers.
- Open `proxy.ts`. Two things happen here:
  1. **Rate limiting** for the login endpoint only (`POST /api/auth/callback/credentials`). A brute-force attacker who guesses credentials rapidly hits the 10-per-15-minute wall before they can loop. The in-memory map is acceptable here because a reset (new function instance) clears the count — sufficient to deter scripts without requiring Redis.
  2. **Request ID propagation**. Every request gets a `x-request-id` header if it didn't already have one. This ID is passed through to the Route Handler (via `getRequestId(request)`) and included in every error log. In production, this ID also appears in Sentry traces. It connects a browser error to a server log without storing any PII.
- `proxy.ts` does **not** enforce auth. Auth is not checked here. This is intentional: the edge runs before the database connection is available. Auth validation (JWT verification, role checks) happens inside the Route Handler, where the full request context is available.

**Visual:** Left column: `proxy.ts` call site with the two annotated blocks. Right column: a log entry showing `requestId` threading from proxy → Route Handler error log → Sentry event.

**Takeaway:** `proxy.ts` handles cross-cutting infrastructure (rate limiting, tracing IDs). Auth enforcement belongs in Route Handlers where business context is available.

**Transition to C-03:** "We've seen how the App Router shapes the API layer. Now let's look at how the codebase organizes its business logic — the modular monolith."
