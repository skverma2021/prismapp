# D-06 — Exercise: Build a Module

---

## Slide 1 of 3 — The Task

**Headline:** Add a ParkingSpace module to PrismApp. Everything from schema to list page.

**Talking points:**
- Give students 10 minutes to plan before opening any file. They should write down on paper: the Prisma model fields, the service functions they need, the route files they need to create, and the UI components they will use.
- Then compare with the reference solution below.

**The domain description:**
A parking space belongs to a block. It has a space number (e.g., "P-101"), a type (COVERED or OPEN), and an optional note. It can be assigned to a unit. One space can be assigned to at most one unit at a time. The list page must support search by space number and filter by type.

**Step 1 — Prisma model** (add to `prisma/schema.prisma`):
```prisma
model ParkingSpace {
  id          String   @id @default(cuid())
  blockId     String
  spaceNumber String
  type        String   // "COVERED" | "OPEN"
  note        String?
  unitId      String?
  createdAt   DateTime @default(now())

  block Block  @relation(fields: [blockId], references: [id])
  unit  Unit?  @relation(fields: [unitId], references: [id])

  @@unique([blockId, spaceNumber])
}
```

**Step 2 — Migration and Prisma client regeneration:**
```bash
npx prisma migrate dev --name parking_spaces
```

**Step 3 — Module files to create:**
```
src/modules/parking-spaces/
  parking-spaces.schemas.ts   ← parse functions for create/update inputs
  parking-spaces.service.ts   ← list, getById, create, update, delete
app/api/parking-spaces/
  route.ts                    ← GET (list) + POST (create)
app/api/parking-spaces/[id]/
  route.ts                    ← GET, PATCH, DELETE
app/(dashboard)/parking-spaces/
  page.tsx                    ← browse + inline edit UI
```

**Visual:** The folder tree above, rendered as a file tree diagram. Annotate each file with its responsibility in one line.

**Takeaway:** Every module follows the same structure. Knowing the structure means you can build a new module by copying the pattern, not by reading tutorials.

---

## Slide 2 of 3 — Reference Solution

**Headline:** Walk through the key decisions — not just the code.

**Talking points:**
Walk through the reference solution focusing on the *decisions*, not just the syntax.

**`parking-spaces.schemas.ts` — key decision:**
What fields are required on create vs optional on update?
```typescript
// create: blockId + spaceNumber + type are required; note and unitId are optional
// update: all fields are optional; at least one must be present (same pattern as blocks)
```

**`parking-spaces.service.ts` — key decisions:**

1. **List function**: `db.$transaction([findMany, count])`. Add `where` conditions for `q` (search by `spaceNumber`) and `type` filter. Whitelist `sortBy` values.

2. **Create function**: No overlap check needed — `@@unique([blockId, spaceNumber])` in the schema enforces uniqueness. Prisma will throw `P2002` if a duplicate is attempted; `fromUnknownError` translates that to `CONFLICT`. No application-level check required.

3. **Delete function**: `db.parkingSpace.delete({ where: { id } })`. If the space is assigned to a unit (via a future `UnitParkingSpace` relation), Prisma would throw `P2003`. `fromUnknownError` translates to `CONFLICT` automatically. No explicit check needed.

4. **The `unitId` assignment rule**: Assigning a space to a unit is an update (`PATCH`). The constraint "at most one unit at a time" is enforced by the `@@unique` constraint if you model it differently — but with a nullable FK (`unitId?`), you enforce it by checking whether any other space in the block already has `unitId = targetUnitId` before writing. This is a check-then-write — it needs a `$transaction`.

**`app/api/parking-spaces/route.ts` — key decisions:**
- `GET`: `requireReadRole` + `listParkingSpaces(searchParams)` + `ok(data)`
- `POST`: `requireMutationRole` (captures actor) + parse + service + `ok(data, 201)`
- Same four-band shape as every other route handler.

**`app/(dashboard)/parking-spaces/page.tsx` — key decisions:**
- `"use client"` at the top
- `useBrowseState` config: `endpoint: "/api/parking-spaces"`, filters for `q` and `type`, `sortOptions` for `spaceNumber` and `type`
- `useCrudActions` wired to `state.setSubmitError` and `state.setSubmitSuccess`
- `DataTable` with `rowKey="id"`, columns for `spaceNumber`, `type`, `note`, and a `block.description` lookup
- Create form inline, with a `<select>` for `type`

**Visual:** A completed browse page mockup showing a table with four parking spaces, a type filter dropdown, and a create form.

---

## Slide 3 of 3 — Module Wrap-Up: The Six CRUD Building Blocks

**Headline:** Every module in every project is built from six operations. You now know all six.

**Talking points:**
- This is the end of Section D. The summary is deliberately a checklist — students can use it when building their own modules.

| Operation | Server pattern | Client pattern |
|---|---|---|
| **List** | `db.$transaction([findMany, count])` + paginated envelope | `useBrowseState` + `fetchJsonWithRetry` |
| **Create** | auth → parse → `db.X.create()` → audit log → `ok(201)` | `useCrudActions.create()` → `onSuccess` prepend |
| **Get by ID** | `findUnique` → `null` → `HttpError(404)` | `fetch GET /api/X/:id` |
| **Update** | before-snapshot → `db.X.update()` → audit diff → `ok(200)` | `useCrudActions.update()` → `onSuccess` replace |
| **Delete** | `db.X.delete()` → `Response(null, 204)` | `useCrudActions.delete()` → `onSuccess` filter out |
| **Complex write** | `db.$transaction(async tx => {...})` — check + write atomic | Same as create/update; the transaction is invisible to the client |

- Notice what is missing from this table: business logic. Business logic lives in the service — it is not one of the six patterns. The six patterns are the *plumbing* that moves data between the database and the client. Business logic runs inside the service functions that the plumbing calls.
- Final thought: the best way to test your understanding is the parking space exercise. If you completed it without looking at existing files, you have internalized the pattern. If you looked at `blocks.service.ts` as a reference while writing `parking-spaces.service.ts` — that is fine too. Experienced developers copy patterns from their own codebase all the time. The goal is to know *why* the pattern is shaped the way it is.

**Visual:** The six-operation table above, rendered cleanly. Below: a one-line challenge — "Build the parking space module. Then build something from your own domain."

**Section transition note:**
Section D complete. In Section E — Hardening — we will look at what makes the difference between a working prototype and a production deployment: audit logging, role enforcement verification, performance indexes, and observability with Sentry.
