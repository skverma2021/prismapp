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

Welcome to Section D.

We have covered scope, data modeling, and technology. Now we build.

The first operation every module needs is a list. The simplest list implementation is `return db.block.findMany()`. It is wrong for two reasons.

It returns every row. And it gives the client no information about how to paginate.

[OPEN: src/types/api.ts — show PaginatedResponse<T>]

A production list response wraps items inside a paginated envelope. It has seven fields.

The client needs `totalItems` to render the pagination controls. Without it, the UI cannot know if page 2 exists.

`page` and `pageSize` are echoed back. If the user refreshes, the client can rebuild the same request from the URL.

`items` is always bounded by `pageSize`. The default is 20. The maximum is 100.

This limit is not random. It stops a client from pulling the entire table by accident when it omits pagination parameters.

**Takeaway: never return a raw array. Always return the paginated envelope.**

---

### D-01-2: The `$transaction([findMany, count])` Pattern

[OPEN: src/modules/blocks/blocks.service.ts — find the $transaction line]

Here is the correct pattern:

```typescript
const [items, totalItems] = await db.$transaction([
  db.block.findMany({ where, orderBy, skip, take }),
  db.block.count({ where }),
]);
```

Why not two separate awaits? Because there is a time window between them. Show the race diagram.

Look at the gap between query 1, `findMany`, and query 2, `count`. Another request could insert a row in that gap. Then the count is 1 higher than the rows in `items`.

The pagination UI would say "53 records" but show only 52 across all pages. Users would see a phantom "next page" that comes back empty.

`db.$transaction([...])` wraps both queries in the same snapshot. Both queries see the identical table state.

The rest of `listBlocks()` is straightforward. It parses page, pageSize, q, sortBy, and sortDir. Then it computes totalPages and returns the envelope.

**Takeaway: always pair findMany and count inside `$transaction([...])`.**

---

### D-01-3: Parsing Parameters Safely

[OPEN: blocks.service.ts — the parameter parsing section at the top of listBlocks]

Every value from `searchParams` is an untrusted string.

We validate three things.

First, type coercion. `parseQueryInt` converts null or non-numeric strings to the default value.

Second, range bounds. The code is `if (pageSize > MAX_PAGE_SIZE) throw HttpError(400, ...)`. It prevents unbounded queries.

Third, the enum whitelist. The code is `if (!["description","createdAt"].includes(sortBy))`. It prevents sorting on fields the API did not intend to expose.

The `q` parameter goes into a Prisma `{ contains: q, mode: "insensitive" }` filter. Prisma parameterizes this value. It is never a raw SQL string.

So SQL injection through the search field is not possible.

**Takeaway: URLSearchParams are user input. Parse them, bound them, whitelist them.**

---

## D-02 — The Create Pattern

### D-02-1: Four Steps, No More

[OPEN: app/api/blocks/route.ts — POST handler]

Read the function aloud. Annotate the four bands.

Auth. Parse. Service. Respond. That is all.

The catch block handles every failure. A wrong role gives 403. Bad input gives 400. A duplicate gives 409. An unexpected error gives 500.

In each case, `fromUnknownError` translates the error and `fail()` wraps it. The caller always gets the same envelope shape.

Why 201 and not 200? HTTP 201 Created is the correct status for a successful resource creation. 200 OK means "request processed."

Both are success codes. But 201 tells the client and your monitoring tools that a new resource exists.

The `actor` from `requireMutationRole` is passed into `createBlock`. The service uses it for the audit log.

The identity travels from the JWT all the way into the audit trail. It needs no extra database lookup.

**Takeaway: four lines of logic in the route handler. Everything else lives in the service.**

---

### D-02-2: Inside `createBlock`: Parse → Write → Audit

[OPEN: src/modules/blocks/blocks.service.ts — createBlock function]

Three lines. That is all.

First, `db.block.create({ data: input })`. Prisma generates the INSERT. The database generates the `id`, which is a UUID, and `createdAt`. The returned `result` has the final values.

Second, `writeAuditLog`. It records who did it, what they did, and what the payload was.

It is written after the data write, not inside a transaction with it. If the audit log write fails, the block is still created. The failure is logged separately.

[OPEN: blocks.schemas.ts — parseCreateBlockInput]

The function accepts `unknown`. It does not accept `any`. First, it checks that the payload is a non-null object.

Then `requireString` checks that the field is a non-empty string. If not, it throws a descriptive error.

The key principle is this. The parse step converts `unknown` into a typed shape. The service step converts the typed shape into a database row.

These steps are separate. The service never receives raw untrusted input.

**Takeaway: parse to typed shape. Service uses typed shape. Never bypass parsing.**

---

### D-02-3: Client Side: `useCrudActions.create()`

[OPEN: src/hooks/use-crud-actions.ts — create function]

The client mirrors the server in reverse.

Step one. Set loading to true.
Step two. Clear previous error and success messages.
Step three. Send `fetch POST` with a JSON body.
Step four. Read `ApiEnvelope<T>`.

Step five. Check BOTH `response.ok`, the HTTP status, AND `payload.ok`, the business status.

Step six. On success, call `onSuccess(payload.data)`. The caller decides what to do next.
Step seven. On failure, call `setSubmitError(message)`.
Step eight. Finally, always clear loading.

The `onSuccess` callback is how the caller puts the result into the UI. The caller can add the new row to the top of the list, reset the form, or show a success notice.

The hook does not make those decisions. It delegates them.

**Takeaway: `useCrudActions.create()` handles the network mechanics. The caller handles the UI response.**

---

## D-03 — GET, PATCH, DELETE

### D-03-1: GET by ID: The `get-or-404` Pattern

[OPEN: app/api/blocks/[id]/route.ts — GET handler]

Notice two things immediately.

First, `await params`. In Next.js 16, the params object is a Promise. You must await it before destructuring.

Forgetting this is the most common App Router 16 mistake. The `id` you get is a pending Promise, not a string.

Second, `requireReadRole`. A GET still requires auth. Any unauthenticated request gets 401.

[OPEN: blocks.service.ts — getBlockById]

`findUnique` returns `null` when no row matches. The service converts that null into `HttpError(404, "NOT_FOUND")`.

The catch block of the route handler translates it to `{ ok: false, error: { code: "NOT_FOUND" } }`.

Prisma also throws P2025 for operations that target a record that does not exist. `fromUnknownError` maps that to 404 as well.

So we have double protection.

**Takeaway: null from Prisma = throw HttpError(404). Never return a 200 with empty data for a missing record.**

---

### D-03-2: PATCH: The Before-Snapshot Pattern

[OPEN: blocks.service.ts — updateBlock]

`const before = await db.block.findUnique({ where: { id }, select: { description: true } })`

The before-snapshot costs one extra query. It is worth it.

The audit log records `{ before: { description: "Block A" }, after: { description: "Block G" } }`. An auditor can see exactly what changed.

Without the before-snapshot, the audit log would only record "something changed." That is not auditable.

`db.block.update` throws P2025 if the ID does not exist. `fromUnknownError` maps that to 404. So we need no explicit existence check before the update.

`parseUpdateBlockInput` validates that at least one field is present. A PATCH with no fields does nothing, but it would fill the audit log with noise. So the validator rejects it.

**Takeaway: read before → update → audit with diff. The extra read is the audit trail.**

---

### D-03-3: DELETE: 204 and Referential Integrity

[OPEN: app/api/blocks/[id]/route.ts — DELETE handler]

`return new Response(null, { status: 204 })`

Not `ok()`. Not `ok(undefined)`. A raw `Response` with no body.

HTTP 204 No Content means exactly that. There is no content.

Using `ok()` would set Content-Type to application/json and try to serialize a body. The client would receive a content-type mismatch. So use `new Response(null, { status: 204 })`.

[SHOW: response shape table]

Here are the four operations and their success shapes. 201 for create. 200 for get and update. 204 for delete.

These are not just conventions. They come from the HTTP spec.

What happens if you try to delete a block that has units?

The PostgreSQL foreign key constraint fires. Prisma catches it as P2003. `fromUnknownError` translates it to `CONFLICT` 409.

The client gets a clean error message. There is no raw database error and no stack trace.

**Takeaway: DELETE returns 204 with no body. Referential integrity violations become CONFLICT 409.**

---

## D-04 — Transactions and Complex Writes

### D-04-1: When a Single Prisma Call Is Not Enough

[SHOW: race condition timeline diagram]

Here is the problem.

Two concurrent requests both want to create an ownership for the same unit. Both read the current ownership table. Both see no overlap. Both pass the check. Both write.

The database now has two overlapping ownership records. This breaks a domain rule. It happened because the check and the write were in separate database calls.

This is a classic check-then-write race condition. The window is only milliseconds wide. But in production, with many concurrent users, it happens.

The database cannot prevent this with a UNIQUE constraint. A temporal overlap is not a uniqueness rule.

So the application must enforce it. And to enforce it correctly, the check and the write must be atomic.

**Takeaway: if your write depends on reading first, both must happen in a single transaction.**

---

### D-04-2: `$transaction(async tx => ...)` for Check-Then-Write

[OPEN: src/modules/ownerships/ownerships.service.ts — createOwnership]

Every query inside this callback uses `tx`, not `db`. The `tx` object is a Prisma client scoped to the transaction.

All queries inside it see the same consistent snapshot. No other transaction can insert between them.

Walk through the callback.

Step one. `ensureOwnershipReferencesExist(tx, ...)` verifies that the unit and individual exist.
Step two. `ensureNotBeforeUnitInception(...)` is a pure date check. It does not use the database.
Step three. `ensureNoOwnershipOverlap(tx, ...)` reads `tx.unitOwner.findMany(...)` within the transaction.
Step four. `ensureOwnershipContinuity(tx, ...)` validates the timeline.
Step five. `tx.unitOwner.create(...)` is the write. It is also within the transaction.

If step three throws, the transaction rolls back. The create never runs. Nothing is written.

`writeAuditLog` is called after the `$transaction` resolves. It uses `db`, not `tx`.

The audit log is outside the business transaction on purpose. It is an append-only log. An audit failure should not roll back the business write.

[SHOW: two-form comparison table]

`$transaction([...])` for batch read + count. `$transaction(async tx => {...})` for check-then-write.

**Takeaway: check-then-write must use the callback form. Every helper inside must accept and use the `tx` parameter.**

---

### D-04-3: Multi-Row Writes: The Contribution Header + Detail

Remember the header-detail pattern from Section B. A single contribution payment writes one header row and N detail rows.

These N+1 rows are one business event.

Suppose the header is written, but the third detail row fails because of a duplicate period. Then the database is inconsistent. It has a header with missing periods.

[SHOW: conceptual transaction code block]

All N+1 writes are inside a single `$transaction(async tx => {...})`. The duplicate period check runs inside the same transaction.

If anything fails, everything rolls back. The header is never created.

This is what the domain rule means in practice: "Contributions are immutable once recorded."

They are immutable because they were written correctly and completely the first time. They were written atomically.

**Takeaway: logically related rows must be written atomically. Partial writes violate domain integrity.**

---