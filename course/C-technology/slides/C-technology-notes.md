# C-Technology — Assembled Speaker Notes

These are the presenter notes for Section C: Technology Stack and Architecture.
Organized by topic file and slide number. Use these in Camtasia or alongside the PowerPoint.

---

## C-01 — Technology Choices Follow Architecture

### C-01-1: The Wrong Way to Choose a Stack

Good morning / welcome back. Before we look at a single line of PrismApp code, I want to address a question I hear constantly: "Which framework should I use?"

The answer is: that is the wrong first question.

[SHOW: stack popularity poll / Stack Overflow survey screenshot]

This is what "framework selection by preference" looks like. It's a popularity contest. The problem is that popularity is measured across all use cases, and your use case is specific. A framework that is excellent for building marketing sites may be a poor fit for a financial ledger.

The right first question is: what are my architectural requirements? What constraints does this system have to satisfy? Once you can answer that, the technology options narrow dramatically.

For PrismApp, there are four constraints that mattered most. We're going to trace each one to the technology choice it drove.

**Takeaway: Work backwards from requirements. Never forwards from preference.**

---

### C-01-2: Four Requirements, Four Choices

[OPEN: AGENTS.md Section 5]

Let me read the first bullet: "Stateless application servers — required on Vercel." That one sentence rules out a class of architectures. No sticky sessions. No in-process cache shared across requests. No in-memory job queues that persist between restarts.

[SHOW: table, animate row by row]

**Row 1 — Stateless servers → Next.js App Router.** Every Route Handler in Next.js is a function. It starts, handles one request, and exits. That's stateless by design.

**Row 2 — Relational integrity → PostgreSQL.** Remember in Section B we had temporal overlap prevention, duplicate payment protection, and foreign key enforcement between units, owners, and contribution details. Those rules require ACID transactions and foreign keys. PostgreSQL does this; MongoDB does not.

**Row 3 — Type-safe data access with migration history → Prisma.** The schema is defined in `prisma/schema.prisma`. When you change the schema, Prisma generates a migration SQL file. You have a versioned history of every schema change. And Prisma generates TypeScript types from the schema — your IDE knows the shape of every table without you maintaining separate type definitions.

**Row 4 — Role-based access → next-auth.** Three roles, JWT sessions, role claim baked into the token. No database round-trip to check the role on every request.

And finally: **TypeScript**, end-to-end. Domain rules expressed in code are only as reliable as the type system enforcing them. TypeScript catches rule violations at compile time.

**Takeaway: Every tool in this stack can be traced to a named requirement.**

---

### C-01-3: The Deployment Constraint

Now let me zoom in on the Vercel deployment constraint, because it affects more code than you might expect.

[SHOW: deployment diagram — browser → Vercel Edge → Serverless Function → connection pool → PostgreSQL]

Vercel runs each Route Handler as a serverless function. This means three things for PrismApp:

First, **no persistent in-memory state.** Look at `proxy.ts` — the rate limiter uses an in-memory Map. The comment acknowledges: "A new function instance resets state — sufficient to deter automated scripts." This is a deliberate, documented tradeoff.

Second, **JWT sessions, not server sessions.** A server session store requires a process that lives between requests — that contradicts serverless. JWTs are signed, self-contained, and verified without any server-side store.

Third, **connection pooling.** [OPEN: `src/lib/db.ts`] See the `PrismaPg` adapter on line 3. Serverless functions cannot hold a long-lived database connection — they would exhaust PostgreSQL's connection limit after a few hundred concurrent invocations. The `@prisma/adapter-pg` adapter uses PgBouncer-style connection management. Each function invocation borrows a connection from the pool and returns it immediately.

[POINT TO: the `global.prisma ??` guard]

This is a dev-only optimization. Next.js in development reloads modules on every file save. Without this guard, each reload would create a new Prisma client with a new connection pool. In production, there is no hot-reload, so the guard is inert.

**Takeaway: Deployment shape drives code shape. Read the deployment architecture before writing setup code.**

---

## C-02 — The Next.js App Router

### C-02-1: Server vs Client: The Fundamental Split

[OPEN: app/(dashboard)/layout.tsx and app/(dashboard)/blocks/page.tsx side by side]

The App Router introduces a distinction that changes how you think about components: **Server** and **Client**.

Server Components run during the request, on the server. They have full access to environment variables, the database, and the auth session. They never ship JavaScript to the browser.

Client Components are marked `"use client"` at the top of the file. They run in the browser. They have state, event handlers, and browser APIs. They cannot directly access the database.

Look at the layout: no `"use client"` directive. It's a Server Component. The first thing it does is call `requireServerAppSession()`. This runs on the server, reads the JWT cookie, and redirects to the login page if the session is missing or expired. An unauthenticated user never receives any page HTML — the redirect happens before rendering.

Now look at blocks/page.tsx. First line: `"use client"`. This is a Client Component. It uses `useState`, event handlers, and `fetch`. It has no direct database access.

[SHOW: two-tree diagram, blue for server, green for client]

The rule: default to Server Component. Add `"use client"` only when you need browser APIs, state, or event handlers.

**Takeaway: Server Components are the default. Client Components are the deliberate exception.**

---

### C-02-2: Route Handlers: Your API Layer

[OPEN: app/api/blocks/route.ts]

Route Handlers are Next.js's API layer. No separate Express server. No separate API project. The Next.js server is the API server.

Each Route Handler file exports named async functions: `GET`, `POST`, `PATCH`, `DELETE`. Each function receives a `NextRequest` and returns a `Response`.

Let me read the POST handler aloud and annotate it:

[READ: POST function, annotate four bands]

1. `requireMutationRole(request)` — **auth band.** No further code runs unless this passes.
2. `request.json()` then `parseCreateBlockInput(payload)` — **parse band.** No database access until input is clean.
3. `createBlock(input, actor)` — **service band.** All business logic happens here.
4. `return ok(data, 201)` — **respond band.** The standard envelope wraps the result.

This four-step shape is identical in every Route Handler in this project. When you read one, you understand all of them.

The catch block calls `fail(fromUnknownError(error, getRequestId(request)))`. This is the translation layer — any error, from any layer, becomes the standard error envelope. The request ID connects this error to the Sentry trace.

**Takeaway: Every Route Handler follows auth → parse → service → respond. Deviation from this shape is a review flag.**

---

### C-02-3: Why `proxy.ts` and Not `middleware.ts`

[OPEN: proxy.ts]

If you've used Next.js before version 16, you may be looking for `middleware.ts`. In Next.js 16, cross-cutting middleware is `proxy.ts`, exported as `proxy`.

Two things happen here:

**Rate limiting.** Only the login endpoint is rate-limited. Why not every endpoint? Because rate limiting every API call would break legitimate users making multiple requests. The login endpoint is the only attack surface for brute-force credential attacks.

[POINT TO: the credential rate limit block]

10 attempts per 15-minute window per IP. This closes the OWASP brute-force gap without requiring Redis or any external dependency.

**Request ID propagation.** [POINT TO: the requestId block]

Every API request gets a unique ID: `crypto.randomUUID()`. This ID is forwarded to the Route Handler in the `x-request-id` header, included in every error log, and linked in Sentry. In production, this is how you connect a user's "something went wrong" report to a specific server error.

Note what is NOT here: auth. The proxy does not check JWTs. Auth verification requires the Prisma client and the full request context — those are only available inside the Route Handler.

**Takeaway: `proxy.ts` handles infrastructure concerns: rate limiting and request tracing. Auth lives in Route Handlers.**

---

## C-03 — The Modular Monolith

### C-03-1: What Is a Modular Monolith?

[SHOW: src/modules/ folder tree]

Thirteen module folders. Blocks, units, individuals, ownerships, residencies, contributions, reports, and more. Each one is an island.

The rule is simple: a module can import from `src/lib/` (shared utilities) and from its own folder. It cannot import from another module. If a contribution needs to look up a unit, it calls the units service — it does not reach into `src/modules/units/units.schemas.ts` from inside `src/modules/contributions/`.

[SHOW: the four-level table: lib, modules, route handlers, UI pages]

This is the hierarchy. Data only flows down this hierarchy, never sideways between modules.

Why does this matter? PrismApp will grow. The CMM module — Complaint Management — is already planned. When a developer adds `src/modules/complaints/`, they should be able to work in that folder without reading or touching `src/modules/contributions/`. Module boundaries, enforced by import discipline, make that possible.

**Takeaway: The folder structure is architecture. Module boundaries prevent accidental coupling.**

---

### C-03-2: What Goes Where: Service, Schemas, Route Handler

[OPEN: src/modules/blocks/ — show three files]

Three files per module. One responsibility per file.

[OPEN: blocks.schemas.ts]

**Schemas file.** This is the input contract. It defines what shape the caller must provide and throws `HttpError(400, "VALIDATION_ERROR")` if the input doesn't comply. It does not touch the database. It has no business logic.

[OPEN: blocks.service.ts]

**Service file.** This is where business logic lives. It calls the Prisma client. It enforces rules — look at line 20: `if (pageSize > MAX_PAGE_SIZE) throw new HttpError(400, "VALIDATION_ERROR", ...)`. It writes audit log entries on mutations. It returns typed objects.

Notice what is NOT here: HTTP verbs, status codes, or request objects. The service function receives a `URLSearchParams` or a typed input object. It doesn't care whether the caller is an HTTP request, a unit test, or a CLI script.

[OPEN: app/api/blocks/route.ts]

**Route Handler.** This is the thin HTTP adapter. Its only job is to connect the HTTP layer to the service layer. It has no Prisma calls. It has no business rules. It calls schemas to parse, calls service to execute, calls `ok()`/`fail()` to respond.

**Takeaway: Business logic in a Route Handler is a smell. HTTP codes in a service file are a smell. Three files, three responsibilities.**

---

### C-03-3: Why Not Microservices?

Let me address the question that comes up in every architecture discussion: "Why not microservices?"

[SHOW: three-column diagram: single file, modular monolith, microservices]

Microservices solve real problems — at scale. Independent deployment, independent scaling, team autonomy for large engineering organizations. These are genuine benefits.

But microservices introduce real costs: network calls between services, distributed transaction management, separate CI/CD pipelines, separate test environments for each service. For a two-person team building a society management tool, these costs have no payoff.

The modular monolith is the correct first architecture. And here's the key point: the module boundaries we've drawn now are the same boundaries you'd draw if you were extracting a microservice later. The folder structure is already segmented. The imports are already disciplined.

[SHOW: extraction scenario]

If `src/modules/contributions/` ever needed to scale independently, the extraction is a defined operation: create a new project, copy the service file, replace Prisma imports with an HTTP client, update the Route Handler to call externally. No other module changes — because no other module imports from contributions directly.

**Takeaway: The modular monolith satisfies V1. The module boundaries make future extraction possible. Don't build microservices for a problem you don't have yet.**

---

## C-04 — The Shared API Contract

### C-04-1: The Problem with Inconsistent Responses

[SHOW: four inconsistent response shape examples]

This is what an API without a shared contract looks like. Four endpoints, four different response shapes. The client code needs four different parsing paths.

Now imagine this at scale: twenty endpoints, twenty developers, two years of evolution. Some endpoints return `{ data: [...] }`, some return `{ items: [...] }`, some return arrays directly. Error responses are strings in some places, objects in others, sometimes a `success: false` flag, sometimes an HTTP status code with no body.

The client team — which in a full-stack project is you — spends as much time decoding API shapes as building features.

PrismApp defines one contract. Every endpoint uses it. Every client relies on it.

**Takeaway: A shared response envelope is a contract. Define it once. Use it everywhere.**

---

### C-04-2: The Envelope: `ok()` and `fail()`

[OPEN: src/lib/api-response.ts — scroll to `ok()` and `fail()` functions]

Two functions. Two shapes. No ambiguity.

Success: `{ ok: true, data: T }`. Optionally a `warning` string if the operation succeeded but something should be noted — for example, if a contribution rate was superseded.

Failure: `{ ok: false, error: { code, message, details, retryable } }`.

[POINT TO: code field]

The `code` field is the machine-readable contract. `CONFLICT` means "a uniqueness or overlap rule was violated." The client doesn't need to parse the message string to know what happened — it switches on `error.code`.

[POINT TO: retryable field]

The `retryable` flag matters for financial operations. If PostgreSQL returns a write conflict during a serializable transaction — Prisma code `P2034` — the `retryable` flag is `true`. The client can retry. If it returns `CONFLICT` for a duplicate payment, retrying would create another duplicate. `retryable: false`.

[WALK THROUGH: the full error code table]

These nine codes cover every error scenario in this system. A new developer reading the first five lines of an error response immediately knows: what kind of error it is, whether to retry, and what to show the user.

**Takeaway: The error code is the contract. The HTTP status code is contextual. Switch on `error.code`, not on HTTP status.**

---

### C-04-3: Prisma Errors → Domain Errors: `fromUnknownError`

[OPEN: src/lib/api-response.ts — scroll to `fromUnknownError()`]

When Prisma throws, it throws its own error format: `{ code: "P2002", meta: { target: [...] } }`. If we let this reach the client, we've leaked database internals: table names, field names, Prisma's internal error taxonomy.

`fromUnknownError` is the translation layer. It runs in every Route Handler's catch block. It reads whatever error arrives and maps it.

[WALK THROUGH: P2002 → CONFLICT; P2025 → NOT_FOUND; P2034 → SERVICE_UNAVAILABLE]

P2034 is worth a moment. This is the code Prisma throws when two concurrent transactions conflict during a serializable write. The correct response is "please retry." That's exactly what `SERVICE_UNAVAILABLE` with `retryable: true` communicates.

[POINT TO: the unknown error fallback]

Anything that isn't a known HttpError or a known Prisma code becomes `INTERNAL_ERROR` 500. The original error is logged — with the request ID — but never sent to the client. The user sees a generic "something went wrong" message. The developer sees the full error in Sentry, linked by request ID.

**Takeaway: The client never sees a raw database error. `fromUnknownError` is the firewall between database internals and the public API contract.**

---

## C-05 — The Auth Boundary

### C-05-1: What Authentication and Authorization Mean Here

Let me start by fixing two terms that are constantly conflated.

**Authentication**: who are you? Result: a verified identity.
**Authorization**: what are you allowed to do? Result: permitted or denied.

PrismApp uses next-auth for authentication. The login flow: user submits credentials → bcryptjs verifies the password hash → next-auth issues a JWT. The JWT contains `{ userId, role }`, signed with `AUTH_SECRET`. The token is stored in a cookie.

[SHOW: sequence diagram — login → JWT → cookie → subsequent request]

On subsequent requests, the server reads the cookie, verifies the signature, and extracts the claims — without touching the database. The role is trusted for the lifetime of the token.

[OPEN: src/lib/user-role.ts]

Three roles:
- `READ_ONLY`: can read data, cannot write
- `MANAGER`: can read and write
- `SOCIETY_ADMIN`: can read, write, and manage users and audit logs

`READ_ACCESS_ROLES` includes all three. `MUTATION_ROLES` includes only `SOCIETY_ADMIN` and `MANAGER`.

**Takeaway: JWT authentication is stateless. The role is verified from the signed token on every request — no database hit required.**

---

### C-05-2: Enforcing the Boundary

[OPEN: src/lib/authz.ts]

The implementation is short. Let's read it together.

[WALK THROUGH: requireMutationRole → requireRole → getAuthContext → getToken]

The chain: get the JWT from the cookie → extract userId and role → verify the role is in the allowed set → return `AuthContext = { userId, role }`.

Two throw points:
1. `401 UNAUTHORIZED` — no token, or the token is malformed. The caller is not authenticated.
2. `403 FORBIDDEN` — the token is valid, but the role is not in `allowedRoles`. The caller is authenticated but not permitted.

[RETURN TO: app/api/blocks/route.ts POST handler]

First line: `const actor = await requireMutationRole(request)`.

The returned `actor` is passed all the way to `createBlock(input, actor)`. The service writes `actor.userId` and `actor.role` to the audit log. This is the chain of custody for financial records.

**Takeaway: `requireReadRole` / `requireMutationRole` / `requireAdminRole` — these must be the first `await` in every Route Handler. Skipping them leaves the endpoint unprotected.**

---

### C-05-3: The Critical Misconception: UI-Only Checks Are Not Security

This is the most important slide in this section.

[SHOW: hidden delete button in UI]

Here is the scenario. A `READ_ONLY` user logs in. The UI hides the delete button because the role check says they shouldn't see it. The developer considers this "protected."

[SHOW: curl command to DELETE endpoint without requireMutationRole]

But the Route Handler's `DELETE` function forgot to call `requireMutationRole`. Anyone who can send an HTTP request — and every developer with a laptop can do this — can delete the record. The UI never runs. The button is irrelevant.

[SHOW: two swim lanes — rendering layer vs data layer]

Layer 1: the rendering layer. `requireServerAppSession` in the layout prevents rendering private pages. Role checks in the UI hide unauthorized controls. Purpose: **user experience**.

Layer 2: the data layer. `requireReadRole` / `requireMutationRole` in Route Handlers. Purpose: **security**.

These two layers do different jobs. Both are needed. But if you had to pick one, Layer 2 is the security guarantee. Layer 1 is never sufficient alone.

From AGENTS.md Section 12: "Keep UI gating aligned with backend rules, but never rely on UI-only enforcement."

**Takeaway: UI role checks are user experience. Route Handler role checks are security. Write both. Never rely on just the first.**

---

## C-06 — Exercise: Trace a Request

### C-06-1: The Exercise: Follow a POST

[PAUSE: give students 3 minutes to write their own sequence]

Before I show you the answer, I want you to take 3 minutes and write down your version of the sequence. A MANAGER user submits a new block. What happens, from click to database row?

[WAIT 3 minutes]

Now let's compare.

[SHOW: six-layer sequence, animate step by step]

1. Browser → `useCrudActions` calls `fetchJsonWithRetry('POST', '/api/blocks', ...)`
2. proxy.ts → not the login endpoint → skip rate limit → inject `x-request-id`
3. Route Handler → `requireMutationRole` passes → `parseCreateBlockInput` validates → `createBlock` called
4. Service → `db.block.create(...)` → Prisma generates INSERT SQL
5. PostgreSQL → writes row, returns it → audit log written
6. Response → `ok(data, 201)` → `{ ok: true, data: { id, description, createdAt } }`
7. Browser → `fetchJsonWithRetry` unwraps → table row appears

Six layers. Each has one job. None duplicate each other's work.

**Takeaway: A production request touches six layers. Understanding all six means you can debug any of them in isolation.**

---

### C-06-2: What Happens When It Goes Wrong

[SHOW: three failure path diagrams side by side]

Three failure scenarios for the same endpoint.

**Duplicate block.** The name already exists in the database. PostgreSQL throws a unique constraint violation. Prisma wraps it as `P2002`. `fromUnknownError` maps it to `CONFLICT`. The client receives `{ ok: false, error: { code: "CONFLICT", retryable: false } }`. The UI shows "this block already exists." No raw database error visible anywhere.

**Wrong role.** A `READ_ONLY` user sends the request. `requireMutationRole` throws `HttpError(403, "FORBIDDEN")`. The service never runs. Prisma never runs. The response is `{ ok: false, error: { code: "FORBIDDEN" } }`.

**Bad input.** The description is an empty string. `parseCreateBlockInput` throws `HttpError(400, "VALIDATION_ERROR", "description is required.")`. The database is never touched.

Notice the pattern: each failure is caught at the earliest possible layer. Validation failures never reach the service. Auth failures never reach the parse step. Database constraint violations are translated before leaving the server.

**Takeaway: Failures should be caught as early as possible. Each layer only needs to handle errors it can meaningfully translate.**

---

### C-06-3: Module Wrap-Up

[SHOW: six-pattern summary table]

Section C in one table. Six patterns. All transferable.

**Requirements drive technology.** We didn't pick Next.js because it was popular. We picked it because Vercel requires stateless servers, and App Router is stateless by design.

**Server Components for auth-gated rendering.** The layout runs auth before rendering. No client-side redirect ping-pong.

**Route Handler shape: auth → parse → service → respond.** Every endpoint. No exceptions.

**Modular monolith: service + schemas + route.** Thirteen modules, all following the same structure. A new developer can onboard to any module by reading one.

**Shared API envelope.** The client always receives `{ ok: true, data }` or `{ ok: false, error: { code } }`. No guessing.

**Server-side auth boundary.** Route Handlers enforce roles. UI hides buttons. Both are needed. Neither replaces the other.

[FINAL THOUGHT]

These patterns are not framework-specific. They work in Express, Spring Boot, Django, FastAPI. The function names change. The responsibility model doesn't.

Your test: add a new domain module to PrismApp from scratch, without looking at existing module files. Pick an entity — say, a parking space. Define the Prisma model. Write the service. Write the route handler. Add a UI page. If you can do that confidently, you've internalized the architecture.

**Section C is complete. In Section D we'll go deeper into data access: pagination, filtering, and the read model pattern for complex reports.**
