# C-04 — The Shared API Contract

---

## Slide 1 of 3 — The Problem with Inconsistent API Responses

**Headline:** When every endpoint returns a different shape, every client has to guess.

**Talking points:**
- Show a realistic example of what happens without a shared contract. Imagine four endpoints, four different response shapes:

```
GET /api/blocks   → { blocks: [...], total: 52 }
GET /api/units    → { data: [...], count: 52, success: true }
POST /api/blocks  → { id: "abc", description: "Block A" }    ← no wrapper at all
POST /api/units   → { result: { id: "xyz" }, status: "ok" }
```

- The client (the browser's `fetch` call) now needs four different parsing paths. Every time a new developer writes a client, they read the raw response and write custom handling. When an error occurs, there is no consistent `error.code` to switch on — you get whatever message the server chose to return, in whatever field name they happened to use.
- This is not a hypothetical — it is the default outcome when developers build APIs without an explicit contract.
- PrismApp defines a shared contract in `src/lib/api-response.ts`. Every Route Handler in the project uses `ok()` for success and `fail()` for errors. Every client knows the response shape before it makes a single request.

**Visual:** Scatter diagram (left) of inconsistent responses vs envelope diagram (right) showing `{ ok: true, data: ... }` and `{ ok: false, error: { code, message, details, retryable } }`.

**Takeaway:** A shared response envelope is a contract between the server and all clients. Define it once, use it everywhere.

---

## Slide 2 of 3 — The Envelope: `ok()` and `fail()`

**Headline:** Two functions, two shapes, zero ambiguity.

**Talking points:**
- Open `src/lib/api-response.ts`. Find the `ok()` and `fail()` functions (approx. line 105–125). Read them together.

**Success shape:**
```typescript
ok(data)         → { ok: true, data: <T> }
ok(data, 201)    → { ok: true, data: <T> }            // with custom status
ok(data, 200, "Rate has been superseded.")
               → { ok: true, data: <T>, warning: "..." }
```

**Error shape:**
```typescript
fail(error) → {
  ok: false,
  error: {
    code: "CONFLICT",              // ← stable machine-readable code
    message: "Unique constraint.", // ← human-readable, for developer logs
    details: { ... },              // ← optional structured detail (field violations)
    retryable: false               // ← client knows whether to retry automatically
  }
}
```

- The `ok: true/false` boolean is the primary discriminator. The client never needs to check the HTTP status code to know if the business operation succeeded — though the status code is also set correctly.
- The `code` field is the stable contract. HTTP status `409` could mean dozens of things — CONFLICT says "a uniqueness or overlap rule was violated." The client can `switch (error.code)` to show the right user message.
- The `retryable` flag is important for financial operations: if the server returns `SERVICE_UNAVAILABLE` (Prisma write conflict during a serializable transaction), the client can safely retry. If it returns `CONFLICT` (duplicate payment), retrying would be wrong.

Walk through the full list of error codes:
```
VALIDATION_ERROR     400 — bad input shape
UNAUTHORIZED         401 — no session
FORBIDDEN            403 — wrong role
NOT_FOUND            404 — entity doesn't exist
CONFLICT             409 — uniqueness or overlap violation
PRECONDITION_FAILED  412 — domain rule (e.g., period is closed)
RATE_LIMITED         429 — too many requests
INTERNAL_ERROR       500 — unexpected server fault
SERVICE_UNAVAILABLE  503 — transient database failure (retryable)
```

**Visual:** Annotated screenshot of the two functions in `api-response.ts`. Callout boxes pointing to: `ok` discriminator, `code` list, `retryable` flag.

---

## Slide 3 of 3 — Prisma Errors → Domain Errors: `fromUnknownError`

**Headline:** The client should never see a raw database error.

**Talking points:**
- Prisma throws its own error codes when database constraints are violated: `P2002` (unique constraint), `P2003` (foreign key constraint), `P2025` (record not found), `P2034` (write conflict in a serializable transaction).
- If we let these propagate raw to the client, the response would contain database internals: field names, table names, internal error codes. This is an information leak.
- `fromUnknownError()` is the translation layer. It runs in the `catch` block of every Route Handler. It inspects whatever error it receives and maps it to the correct `HttpError`.

```typescript
// What Prisma throws
{ code: "P2002", meta: { target: ["description"] } }

// What the client receives
{
  ok: false,
  error: {
    code: "CONFLICT",
    message: "Unique constraint violated.",
    details: { target: ["description"] }
  }
}
```

- Unknown errors — anything that is not an `HttpError` and not a known Prisma code — become `INTERNAL_ERROR` with a 500. The original error is logged (with request ID) but never returned to the client.
- Point to the `isRetryableDatabaseFailure()` function. It handles transient connectivity issues: `ECONNREFUSED`, `ETIMEDOUT`, Prisma codes `P1001`, `P2024`. These become `SERVICE_UNAVAILABLE` with `retryable: true`, so the client can retry the operation.

**Visual:** Flowchart: incoming error → is it HttpError? → return as-is; is it P2002/P2003/P2025/P2034? → map to domain error; else → log + return INTERNAL_ERROR.

**Takeaway:** The client never sees a raw database error. `fromUnknownError` is the firewall between database internals and the public API contract.

**Transition to C-05:** "The API contract tells us what a response looks like. The auth boundary tells us who is allowed to trigger a response at all. Let's look at how authentication and authorization are enforced."
