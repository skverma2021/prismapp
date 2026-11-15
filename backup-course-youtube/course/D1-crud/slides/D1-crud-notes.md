# Section D1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# D-CRUD — Assembled Speaker Notes

Presenter notes for Section D: CRUD — Data Operations.
Organized by topic file and slide number.

---

## D-01 — The List Pattern

### D-01-1: What a List Endpoint Must Return

Welcome to Section D. We've covered scope, data modeling, and technology. Now we build.

The first operation every module needs is a list. And the simplest list implementation — `return db.block.findMany()` — is wrong for two reasons. It returns every row, and it gives the client no information about how to paginate.

[OPEN: src/types/api.ts — show PaginatedResponse<T>]

A production list response wraps items inside a paginated envelope. Seven fields. The client needs `totalItems` to render the pagination controls. Without it, the UI can't know if page 2 exists.

`page` and `pageSize` are echoed back. If the user refreshes, the client can reconstruct the same request from the URL.

`items` is always bounded by `pageSize`. The default is 20, the maximum is 100. This is not arbitrary — it prevents a client from accidentally pulling the entire table by omitting pagination parameters.

**Takeaway: never return a raw array. Always return the paginated envelope.**

---

### D-01-2: The `$transaction([findMany, count])` Pattern

[OPEN: src/modules/blocks/blocks.service.ts — find the $transaction line]

Here's the correct pattern:

```typescript
const [items, totalItems] = await db.$transaction([
  db.block.findMany({ where, orderBy, skip, take }),
  db.block.count({ where }),
]);
```

Why not two separate awaits? Because there's a time window between them. Show the race diagram.

Between query 1 (findMany) and query 2 (count), another request could insert a row. The count would be 1 higher than what's in `items`. The pagination UI would say "53 records" but only show 52 across all pages. Users would see a phantom "next page" that comes back empty.

`db.$transaction([...])` wraps both in the same snapshot. Both queries see identical table state.

The rest of `listBlocks()` is straightforward: parse page, pageSize, q, sortBy, sortDir — then compute totalPages and return the envelope.

**Takeaway: always pair findMany and count inside `$transaction([...])`.**

---

### D-01-3: Parsing Parameters Safely

[OPEN: blocks.service.ts — the parameter parsing section at the top of listBlocks]

Every value from `searchParams` is an untrusted string. Three things to validate:

1. **Type coercion**: `parseQueryInt` converts null or non-numeric strings to the default value.
2. **Range bounds**: `if (pageSize > MAX_PAGE_SIZE) throw HttpError(400, ...)`. Prevents unbounded queries.
3. **Enum whitelist**: `if (!["description","createdAt"].includes(sortBy))` — prevents sorting on fields the API didn't intend to expose.

The `q` parameter goes into a Prisma `{ contains: q, mode: "insensitive" }` filter. Prisma parameterizes this — it's never a raw SQL string. SQL injection via the search field is not possible.

**Takeaway: URLSearchParams are user input. Parse them, bound them, whitelist them.**

---

## D-02 — The Create Pattern

### D-02-1: Four Steps, No More

[OPEN: app/api/blocks/route.ts — POST handler]

Read the function aloud. Annotate the four bands.

Auth. Parse. Service. Respond. That's it.

The catch block handles everything. Whether the failure comes from auth (wrong role → 403), parse (bad input → 400), service (duplicate → 409), or an unexpected error (→ 500), `fromUnknownError` translates it and `fail()` wraps it. The caller always gets the same envelope shape.

Why 201 and not 200? HTTP 201 Created is the correct status for a successful resource creation. 200 OK means "request processed." Both are success codes, but 201 tells the client — and your monitoring tools — that a new resource exists.

The `actor` from `requireMutationRole` is passed into `createBlock`. The service uses it for the audit log. The identity travels from the JWT all the way into the audit trail without any extra database lookup.

**Takeaway: four lines of logic in the route handler. Everything else lives in the service.**

---

### D-02-2: Inside `createBlock`: Parse → Write → Audit

[OPEN: src/modules/blocks/blocks.service.ts — createBlock function]

Three lines. That's all.

`db.block.create({ data: input })` — Prisma generates the INSERT. The `id` (UUID) and `createdAt` are database-generated. The returned `result` has the final values.

`writeAuditLog` — records who did it, what they did, and what the payload was. Written after the data write, not inside a transaction with it. If the audit log write fails, the block is still created. The failure is logged separately.

[OPEN: blocks.schemas.ts — parseCreateBlockInput]

The function accepts `unknown`. Not `any`. The first thing it does is check the payload is a non-null object. `requireString` checks the field is a non-empty string and throws a descriptive error if not.

The key principle: the parse step converts `unknown` into a typed shape. The service step converts the typed shape into a database row. These are separate — the service never receives raw untrusted input.

**Takeaway: parse to typed shape. Service uses typed shape. Never bypass parsing.**

---

### D-02-3: Client Side: `useCrudActions.create()`

[OPEN: src/hooks/use-crud-actions.ts — create function]

The client mirrors the server in reverse.

1. Set loading = true.
2. Clear previous error/success messages.
3. `fetch POST` with JSON body.
4. Read `ApiEnvelope<T>`.
5. Check BOTH `response.ok` (HTTP status) AND `payload.ok` (business status).
6. On success: call `onSuccess(payload.data)` — the caller decides what to do.
7. On failure: call `setSubmitError(message)`.
8. Finally: always clear loading.

The `onSuccess` callback is how the caller integrates the result into the UI — prepend the new row to the list, reset the form, show a success notice. The hook doesn't make those decisions; it delegates.

**Takeaway: `useCrudActions.create()` handles the network mechanics. The caller handles the UI response.**

---

## D-03 — GET, PATCH, DELETE

### D-03-1: GET by ID: The `get-or-404` Pattern

[OPEN: app/api/blocks/[id]/route.ts — GET handler]

Two things to notice immediately.

First: `await params`. In Next.js 16, the params object is a Promise. You must await it before destructuring. Forgetting this is the most common App Router 16 mistake — the `id` you get is a pending Promise, not a string.

Second: `requireReadRole`. A GET still requires auth. Any unauthenticated request gets 401.

[OPEN: blocks.service.ts — getBlockById]

`findUnique` returns `null` when no row matches. The service converts that null into `HttpError(404, "NOT_FOUND")`. The route handler's catch block translates it to `{ ok: false, error: { code: "NOT_FOUND" } }`.

Prisma also throws P2025 for operations that target a non-existent record — `fromUnknownError` maps that to 404 as well. Double protection.

**Takeaway: null from Prisma = throw HttpError(404). Never return a 200 with empty data for a missing record.**

---

### D-03-2: PATCH: The Before-Snapshot Pattern

[OPEN: blocks.service.ts — updateBlock]

`const before = await db.block.findUnique({ where: { id }, select: { description: true } })`

The before-snapshot costs one extra query. It is worth it. The audit log records `{ before: { description: "Block A" }, after: { description: "Block G" } }`. An auditor can see exactly what changed.

Without the before-snapshot, the audit log would only record "something changed" — which is not auditable.

`db.block.update` throws P2025 if the ID doesn't exist — `fromUnknownError` maps that to 404. No explicit existence check needed before the update.

`parseUpdateBlockInput` validates that at least one field is present. A PATCH with no fields is a no-op that would pollute the audit log — so the validator rejects it.

**Takeaway: read before → update → audit with diff. The extra read is the audit trail.**

---

### D-03-3: DELETE: 204 and Referential Integrity

[OPEN: app/api/blocks/[id]/route.ts — DELETE handler]

`return new Response(null, { status: 204 })`

Not `ok()`. Not `ok(undefined)`. A raw `Response` with no body.

HTTP 204 No Content means exactly that — no content. Using `ok()` would set Content-Type to application/json and try to serialize a body. The client would receive a content-type mismatch. Use `new Response(null, { status: 204 })`.

[SHOW: response shape table]

The four operations and their success shapes. 201 for create, 200 for get/update, 204 for delete. These are not conventions — they are the HTTP spec.

What happens if you try to delete a block that has units? PostgreSQL's foreign key constraint fires. Prisma catches it as P2003. `fromUnknownError` translates to `CONFLICT` 409. The client gets a clean error message. No raw database error. No stack trace.

**Takeaway: DELETE returns 204 with no body. Referential integrity violations become CONFLICT 409.**

---

## D-04 — Transactions and Complex Writes

### D-04-1: When a Single Prisma Call Is Not Enough

[SHOW: race condition timeline diagram]

Here's the problem.

Two concurrent requests both want to create an ownership for the same unit. Both read the current ownership table. Both see no overlap. Both pass the check. Both write. The database now has two overlapping ownership records — a domain rule violation that slipped through because the check and the write were in separate database calls.

This is a classic check-then-write race condition. The window is milliseconds wide, but in production, with multiple concurrent users, it happens.

The database cannot prevent this with a UNIQUE constraint — temporal overlap is not expressible as a uniqueness rule. The application must enforce it. And to enforce it correctly, the check and the write must be atomic.

**Takeaway: if your write depends on reading first, both must happen in a single transaction.**

---

### D-04-2: `$transaction(async tx => ...)` for Check-Then-Write

[OPEN: src/modules/ownerships/ownerships.service.ts — createOwnership]

Every query inside this callback uses `tx` — not `db`. The `tx` object is a Prisma client scoped to the transaction. All queries inside it see the same consistent snapshot. No other transaction can insert between them.

Walk through the callback:
1. `ensureOwnershipReferencesExist(tx, ...)` — verifies unit and individual exist
2. `ensureNotBeforeUnitInception(...)` — pure date check, no DB
3. `ensureNoOwnershipOverlap(tx, ...)` — reads `tx.unitOwner.findMany(...)` within the transaction
4. `ensureOwnershipContinuity(tx, ...)` — validates the timeline
5. `tx.unitOwner.create(...)` — the write, also within the transaction

If step 3 throws, the transaction rolls back. The create never runs. Nothing is written.

`writeAuditLog` is called after the `$transaction` resolves, using `db` (not `tx`). The audit log is outside the business transaction intentionally — it is an append-only log, and an audit failure should not roll back the business write.

[SHOW: two-form comparison table]

`$transaction([...])` for batch read + count. `$transaction(async tx => {...})` for check-then-write.

**Takeaway: check-then-write must use the callback form. Every helper inside must accept and use the `tx` parameter.**

---

### D-04-3: Multi-Row Writes: The Contribution Header + Detail

Remember the header-detail pattern from Section B. A single contribution payment writes one header row and N detail rows.

These N+1 rows are one business event. If the header writes but the third detail row fails (duplicate period), the database is inconsistent — a header with missing periods.

[SHOW: conceptual transaction code block]

All N+1 writes are inside a single `$transaction(async tx => {...})`. The duplicate period check runs inside the same transaction. If anything fails, everything rolls back. The header is never created.

This is what the domain rule means in practice: "Contributions are immutable once recorded." They're immutable because they were written correctly and completely the first time — atomically.

**Takeaway: logically related rows must be written atomically. Partial writes violate domain integrity.**

---