# D-03 — GET, PATCH, DELETE

---

## Slide 1 of 3 — GET by ID: The `get-or-404` Pattern

**Headline:** A missing record is not a server error. It is a 404.

**Talking points:**
- Open `app/api/blocks/[id]/route.ts`. Three things to point out immediately:

```typescript
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireReadRole(_request);
    const { id } = await params;       // ← params is a Promise in Next.js 16
    const data = await getBlockById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}
```

- **`await params`**: In Next.js 16, dynamic route parameters are wrapped in a `Promise`. You must `await params` before destructuring. Forgetting this is one of the most common Next.js 16 mistakes — the destructuring appears to work but delivers a pending Promise object instead of the id string.
- **`requireReadRole`**: Even a read-only GET needs auth. A `READ_ONLY` user can call this. An unauthenticated user cannot.
- Now open `blocks.service.ts` → `getBlockById`:

```typescript
export async function getBlockById(id: string) {
  const block = await db.block.findUnique({ where: { id } });
  if (!block) {
    throw new HttpError(404, "NOT_FOUND", "Block not found.");
  }
  return block;
}
```

- `findUnique` returns `null` (not an exception) when no row matches. The service converts this `null` into an `HttpError(404, "NOT_FOUND")`. The route handler's `catch` block passes this to `fromUnknownError`, which recognizes it as an `HttpError` and passes it through directly. The client receives `{ ok: false, error: { code: "NOT_FOUND", message: "Block not found." } }` with HTTP status 404.
- Prisma also throws `P2025` (record not found) when `findUniqueOrThrow` is used, or when `update`/`delete` targets a non-existent record. `fromUnknownError` maps P2025 to 404 as well — so the protection works from both the service layer and the Prisma error path.

**Visual:** Decision flow: `findUnique` result → null? → throw `HttpError(404)` → `fromUnknownError` → `fail()` → `{ ok: false, error: { code: "NOT_FOUND" } }`. vs not-null → `return block` → `ok(data)`.

**Takeaway:** Never return a 200 with empty data for a missing record. Throw `HttpError(404, "NOT_FOUND")` from the service and let `fromUnknownError` do the translation.

---

## Slide 2 of 3 — PATCH: The Before-Snapshot Pattern

**Headline:** An update that doesn't record what changed before is not auditable.

**Talking points:**
- Open `app/api/blocks/[id]/route.ts` → `PATCH`:

```typescript
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(request);
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateBlockInput(payload);
    const data = await updateBlock(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

- Same four-band shape as POST. The only differences: `PATCH` (partial update), `await params` for the ID, and `return ok(data)` with status 200 (not 201).
- Now open `blocks.service.ts` → `updateBlock`:

```typescript
export async function updateBlock(id: string, input: UpdateBlockInput, actor: AuthContext) {
  const before = await db.block.findUnique({ where: { id }, select: { description: true } });
  const result = await db.block.update({ where: { id }, data: input });
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole:   actor.role,
    action:      "BLOCK_UPDATED",
    entityType:  "Block",
    entityId:    id,
    payload:     { before: { description: before?.description }, after: { description: result.description } },
  });
  return result;
}
```

- `db.block.findUnique(before)` reads the current state before the update. This is the **before-snapshot**. The audit log stores `{ before: ..., after: ... }` so an auditor can see exactly what changed, not just that something changed.
- `db.block.update` throws a Prisma `P2025` if the record doesn't exist — `fromUnknownError` maps that to 404. No need for an explicit existence check before the update.
- `parseUpdateBlockInput` is a partial validator — it accepts `{ description?: string }` and throws a `VALIDATION_ERROR` if no field is provided at all (preventing a no-op PATCH that pollutes the audit log).

**Teaching callout — partial vs full update:**
PATCH means partial update — only send the fields you want to change. PUT means full replacement — send every field. PrismApp uses PATCH throughout. If a client sends `{ description: "Block G" }`, only `description` changes. Other fields are untouched.

**Visual:** Three-step update diagram: pre-read (`before`) → Prisma `update` → audit log with `{ before, after }`. Annotate what happens if the pre-read finds no row.

**Takeaway:** Always capture a before-snapshot for auditable updates. The pre-read costs one extra query; the audit trail is worth it.

---

## Slide 3 of 3 — DELETE: 204 and Referential Integrity

**Headline:** A successful delete has no body. A blocked delete has a `CONFLICT`.

**Talking points:**
- Open `app/api/blocks/[id]/route.ts` → `DELETE`:

```typescript
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(_request);
    const { id } = await params;
    await deleteBlock(id, actor);
    return new Response(null, { status: 204 });  // ← NOT ok()
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(_request)));
  }
}
```

- **`new Response(null, { status: 204 })`** — HTTP 204 No Content has no body. Using `ok()` here would be wrong: `ok()` wraps a value in `{ ok: true, data: ... }` and sets the Content-Type to `application/json`. A 204 response must have no body — sending one confuses HTTP clients and violates the spec.
- Open `blocks.service.ts` → `deleteBlock`:

```typescript
export async function deleteBlock(id: string, actor: AuthContext) {
  await db.block.delete({ where: { id } });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "BLOCK_DELETED", entityType: "Block", entityId: id });
}
```

- `db.block.delete` throws Prisma `P2003` (foreign key constraint violated) if the block has units. `fromUnknownError` maps `P2003` to `HttpError(409, "CONFLICT", "Operation violates a related data constraint.")`. The client receives a 409 with a meaningful message — not a raw database error.
- This is **referential integrity working as intended**. The database schema enforces that a block with child units cannot be deleted. The application layer translates the database's enforcement into a clean API response.

**Response shape summary:**

| Operation | Success HTTP | Success body | Failure |
|---|---|---|---|
| POST (create) | 201 | `{ ok: true, data: <created> }` | `{ ok: false, error: ... }` |
| GET by ID | 200 | `{ ok: true, data: <record> }` | 404 if not found |
| PATCH (update) | 200 | `{ ok: true, data: <updated> }` | 404 if not found, 409 if conflict |
| DELETE | 204 | *(no body)* | 404 if not found, 409 if referenced |

**Takeaway:** DELETE returns 204 with no body. Referential integrity violations on delete become 409 CONFLICT — the database constraint is translated, not leaked.

**Transition to D-04:** "Simple CRUD works well for entities like blocks and individuals. But some domain rules — temporal overlap prevention, multi-row financial writes — cannot be handled by a single Prisma call. We need transactions."
