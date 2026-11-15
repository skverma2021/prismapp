# Section C2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## C-04 — The Shared API Contract

### C-04-1: The Problem with Inconsistent Responses

[SHOW: four inconsistent response shape examples]

This is what an API without a shared contract looks like. There are four endpoints and four different response shapes. The client code needs four different parsing paths.

Now imagine this at scale. Twenty endpoints, twenty developers, two years of evolution.

Some endpoints return `{ data: [...] }`. Some return `{ items: [...] }`. Some return arrays directly.

Error responses are strings in some places and objects in others. Sometimes there is a `success: false` flag. Sometimes there is an HTTP status code with no body.

The client team spends as much time decoding API shapes as building features. In a full-stack project, the client team is you.

PrismApp defines one contract. Every endpoint uses it. Every client relies on it.

**Takeaway: A shared response envelope is a contract. Define it once. Use it everywhere.**

---

### C-04-2: The Envelope: `ok()` and `fail()`

[OPEN: src/lib/api-response.ts — scroll to `ok()` and `fail()` functions]

There are two functions. There are two shapes. There is no ambiguity.

Success looks like this: `{ ok: true, data: T }`. It may also have a `warning` string. The warning is used if the operation succeeded but something should be noted. One example is a contribution rate that was superseded.

Failure looks like this: `{ ok: false, error: { code, message, details, retryable } }`.

[POINT TO: code field]

The `code` field is the machine-readable contract. `CONFLICT` means "a uniqueness or overlap rule was violated."

The client does not need to parse the message string to know what happened. It switches on `error.code`.

[POINT TO: retryable field]

The `retryable` flag matters for financial operations.

Suppose PostgreSQL returns a write conflict during a serializable transaction. Prisma gives code `P2034`. The `retryable` flag is `true`, so the client can retry.

Now suppose it returns `CONFLICT` for a duplicate payment. Retrying would create another duplicate. So `retryable` is `false`.

[WALK THROUGH: the full error code table]

These nine codes cover every error scenario in this system.

A new developer reads the first five lines of an error response. They immediately know what kind of error it is, whether to retry, and what to show the user.

**Takeaway: The error code is the contract. The HTTP status code is contextual. Switch on `error.code`, not on HTTP status.**

---

### C-04-3: Prisma Errors → Domain Errors: `fromUnknownError`

[OPEN: src/lib/api-response.ts — scroll to `fromUnknownError()`]

When Prisma throws, it throws its own error format: `{ code: "P2002", meta: { target: [...] } }`.

Suppose this reaches the client. Then we have leaked database internals. These include table names, field names, and Prisma's internal error taxonomy.

`fromUnknownError` is the translation layer. It runs in the catch block of every Route Handler. It reads whatever error arrives and maps it.

[WALK THROUGH: P2002 → CONFLICT; P2025 → NOT_FOUND; P2034 → SERVICE_UNAVAILABLE]

P2034 is worth a moment. Prisma throws this code when two concurrent transactions conflict during a serializable write.

The correct response is "please retry." That is exactly what `SERVICE_UNAVAILABLE` with `retryable: true` communicates.

[POINT TO: the unknown error fallback]

Anything that is not a known HttpError or a known Prisma code becomes `INTERNAL_ERROR` 500.

The original error is logged with the request ID. It is never sent to the client.

The user sees a generic "something went wrong" message. The developer sees the full error in Sentry, linked by request ID.

**Takeaway: The client never sees a raw database error. `fromUnknownError` is the firewall between database internals and the public API contract.**

---

## C-05 — The Auth Boundary

### C-05-1: What Authentication and Authorization Mean Here

Let me start by fixing two terms that people constantly confuse.

**Authentication**: who are you? Result: a verified identity.
**Authorization**: what are you allowed to do? Result: permitted or denied.

PrismApp uses next-auth for authentication. Here is the login flow.

The user submits credentials. bcryptjs verifies the password hash. next-auth issues a JWT.

The JWT contains `{ userId, role }`. It is signed with `AUTH_SECRET`. The token is stored in a cookie.

[SHOW: sequence diagram — login → JWT → cookie → subsequent request]

On subsequent requests, the server reads the cookie. It verifies the signature and extracts the claims. It does not touch the database.

The role is trusted for the lifetime of the token.

[OPEN: src/lib/user-role.ts]

There are three roles.
- `READ_ONLY`: can read data, cannot write
- `MANAGER`: can read and write
- `SOCIETY_ADMIN`: can read, write, and manage users and audit logs

`READ_ACCESS_ROLES` includes all three. `MUTATION_ROLES` includes only `SOCIETY_ADMIN` and `MANAGER`.

**Takeaway: JWT authentication is stateless. The role is verified from the signed token on every request — no database hit required.**

---

### C-05-2: Enforcing the Boundary

[OPEN: src/lib/authz.ts]

The implementation is short. Let us read it together.

[WALK THROUGH: requireMutationRole → requireRole → getAuthContext → getToken]

This is the chain. Get the JWT from the cookie. Extract userId and role. Verify the role is in the allowed set. Return `AuthContext = { userId, role }`.

There are two throw points.

1. `401 UNAUTHORIZED`: there is no token, or the token is malformed. The caller is not authenticated.
2. `403 FORBIDDEN`: the token is valid, but the role is not in `allowedRoles`. The caller is authenticated but not permitted.

[RETURN TO: app/api/blocks/route.ts POST handler]

Look at the first line: `const actor = await requireMutationRole(request)`.

The returned `actor` is passed all the way to `createBlock(input, actor)`. The service writes `actor.userId` and `actor.role` to the audit log.

This is the chain of custody for financial records.

**Takeaway: `requireReadRole` / `requireMutationRole` / `requireAdminRole` — these must be the first `await` in every Route Handler. Skipping them leaves the endpoint unprotected.**

---

### C-05-3: The Critical Misconception: UI-Only Checks Are Not Security

This is the most important slide in this section.

[SHOW: hidden delete button in UI]

Here is the scenario. A `READ_ONLY` user logs in. The UI hides the delete button, because the role check says they should not see it.

The developer considers this "protected."

[SHOW: curl command to DELETE endpoint without requireMutationRole]

But the `DELETE` function in the Route Handler forgot to call `requireMutationRole`.

Anyone who can send an HTTP request can delete the record. Every developer with a laptop can do this. The UI never runs. The button is irrelevant.

[SHOW: two swim lanes — rendering layer vs data layer]

Layer 1 is the rendering layer. `requireServerAppSession` in the layout prevents rendering private pages. Role checks in the UI hide unauthorized controls. The purpose is **user experience**.

Layer 2 is the data layer. It uses `requireReadRole` / `requireMutationRole` in Route Handlers. The purpose is **security**.

These two layers do different jobs. Both are needed.

But if you must pick one, Layer 2 is the security guarantee. Layer 1 is never sufficient alone.

AGENTS.md Section 12 says: "Keep UI gating aligned with backend rules, but never rely on UI-only enforcement."

**Takeaway: UI role checks are user experience. Route Handler role checks are security. Write both. Never rely on just the first.**

---

## C-06 — Exercise: Trace a Request

### C-06-1: The Exercise: Follow a POST

[PAUSE: give students 3 minutes to write their own sequence]

Before I show you the answer, take 3 minutes. Write down your version of the sequence.

A MANAGER user submits a new block. What happens, from click to database row?

[WAIT 3 minutes]

Now let us compare.

[SHOW: six-layer sequence, animate step by step]

1. Browser → `useCrudActions` calls `fetchJsonWithRetry('POST', '/api/blocks', ...)`
2. proxy.ts → not the login endpoint → skip rate limit → inject `x-request-id`
3. Route Handler → `requireMutationRole` passes → `parseCreateBlockInput` validates → `createBlock` called
4. Service → `db.block.create(...)` → Prisma generates INSERT SQL
5. PostgreSQL → writes row, returns it → audit log written
6. Response → `ok(data, 201)` → `{ ok: true, data: { id, description, createdAt } }`
7. Browser → `fetchJsonWithRetry` unwraps → table row appears

There are six layers. Each has one job. None duplicates the work of another.

**Takeaway: A production request touches six layers. Understanding all six means you can debug any of them in isolation.**

---

### C-06-2: What Happens When It Goes Wrong

[SHOW: three failure path diagrams side by side]

Here are three failure scenarios for the same endpoint.

**Duplicate block.** The name already exists in the database. PostgreSQL throws a unique constraint violation. Prisma wraps it as `P2002`.

`fromUnknownError` maps it to `CONFLICT`. The client receives `{ ok: false, error: { code: "CONFLICT", retryable: false } }`.

The UI shows "this block already exists." No raw database error is visible anywhere.

**Wrong role.** A `READ_ONLY` user sends the request. `requireMutationRole` throws `HttpError(403, "FORBIDDEN")`.

The service never runs. Prisma never runs. The response is `{ ok: false, error: { code: "FORBIDDEN" } }`.

**Bad input.** The description is an empty string. `parseCreateBlockInput` throws `HttpError(400, "VALIDATION_ERROR", "description is required.")`.

The database is never touched.

Notice the pattern. Each failure is caught at the earliest possible layer.

Validation failures never reach the service. Auth failures never reach the parse step. Database constraint violations are translated before leaving the server.

**Takeaway: Failures should be caught as early as possible. Each layer only needs to handle errors it can meaningfully translate.**

---

### C-06-3: Module Wrap-Up

[SHOW: six-pattern summary table]

Here is Section C in one table. It has six patterns. All are transferable.

**Requirements drive technology.** We did not pick Next.js because it was popular. We picked it because Vercel requires stateless servers, and App Router is stateless by design.

**Server Components for auth-gated rendering.** The layout runs auth before rendering. There is no client-side redirect ping-pong.

**Route Handler shape: auth → parse → service → respond.** Every endpoint follows it. There are no exceptions.

**Modular monolith: service + schemas + route.** There are thirteen modules, all with the same structure. A new developer can onboard to any module by reading one.

**Shared API envelope.** The client always receives `{ ok: true, data }` or `{ ok: false, error: { code } }`. There is no guessing.

**Server-side auth boundary.** Route Handlers enforce roles. The UI hides buttons. Both are needed. Neither replaces the other.

[FINAL THOUGHT]

These patterns are not framework-specific. They work in Express, Spring Boot, Django, and FastAPI. The function names change. The responsibility model does not.

Here is your test. Add a new domain module to PrismApp from scratch, without looking at existing module files.

Pick an entity, for example a parking space. Define the Prisma model. Write the service. Write the route handler. Add a UI page.

If you can do that confidently, you have internalized the architecture.

**Section C is complete. In Section D we will go deeper into data access: pagination, filtering, and the read model pattern for complex reports.**
