# Section C2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

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
