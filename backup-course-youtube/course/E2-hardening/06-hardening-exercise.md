# E-06 — Exercise: The Hardening Checklist

---

## Slide 1 of 3 — The Five-Point Security Checklist

**Headline:** Apply this checklist to every route handler you write. Every item is a production requirement.

**Talking points:**
- Open the complaints module from the Section D exercise, or any new module you've written. Work through all five points:

**1. Auth on every read handler**
```typescript
// Every GET route handler must call requireReadRole at its first line
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);  // ← present?
    ...
  }
}
```
Check: does every `GET` and `GET by ID` handler in your module call `requireReadRole`?

**2. Auth on every mutation handler**
```typescript
// Every POST / PATCH / DELETE must call requireMutationRole (or requireAdminRole)
export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);  // ← present? returns actor?
    ...
  }
}
```
Check: does every `POST`, `PATCH`, and `DELETE` handler call `requireMutationRole`? Is the returned `actor` passed to the service?

**3. Audit log on every mutation**
```typescript
// Every service function that writes must call writeAuditLog
await writeAuditLog(db, {
  actorUserId: actor.userId,
  actorRole:   actor.role,
  action:      "PARKING_SPACE_CREATED",
  entityType:  "ParkingSpace",
  entityId:    result.id,
  payload:     input,
});
```
Check: does every create, update, and delete in your service call `writeAuditLog` after the write? Is it outside the transaction?

**4. All errors pass through `fromUnknownError`**
```typescript
} catch (error) {
  return fail(fromUnknownError(error, getRequestId(request)));  // ← present?
}
```
Check: is the catch block in every route handler using `fromUnknownError`, not a raw error message?

**5. Input is always parsed**
```typescript
const payload = await request.json();
const input = parseCreateParkingSpaceInput(payload); // ← present? accepts unknown?
```
Check: does your parse function accept `unknown`, not `any`? Does it validate every required field?

**Visual:** A checklist card — five items with checkboxes. Each item has a one-line pass/fail criterion. Designed to be printed or kept open during code review.

---

## Slide 2 of 3 — The Missing-Index Exercise

**Headline:** Given a slow query, find the missing index and add it.

**Talking points:**
- The complaints table in `prisma/schema.prisma` (added by the CMM module):

```prisma
model Complaint {
  id          String   @id @default(cuid())
  unitId      String
  status      String
  createdAt   DateTime @default(now())
  ...

  @@index([unitId])    // "complaints for this unit"
  @@index([status])    // "complaints with this status"
}
```

**Scenario:** A new report is requested: "All complaints for a specific block, ordered by `createdAt` descending." The report query:
```typescript
db.complaint.findMany({
  where: {
    unit: { blockId: blockId },    // filter: join to unit, filter by blockId
  },
  orderBy: { createdAt: "desc" },
  take: pageSize,
  skip: (page - 1) * pageSize,
})
```

**The problem:** The `ORDER BY createdAt DESC` on a large result set requires PostgreSQL to sort all matching rows before applying `LIMIT`. Without a `[createdAt]` index, this sort is done in memory on however many rows match the `blockId` filter.

**The fix:**
```prisma
model Complaint {
  ...
  @@index([unitId])
  @@index([status])
  @@index([createdAt])   // ← add this for the block-report sort
}
```

Then run the migration:
```bash
npx prisma migrate dev --name add_complaint_created_at_index
```

**When would a composite index be better?** If the report always filters by `unitId` AND sorts by `createdAt` — i.e., "complaints for unit X, newest first" — a composite `@@index([unitId, createdAt])` would allow PostgreSQL to use one index for both the filter and the sort. The column order matters: `unitId` first (equality filter), `createdAt` second (sort/range).

**Takeaway exercise:** Look at the `Complaint` model in the schema. Are there other query patterns (e.g., filter by `status` AND sort by `createdAt`) that would benefit from a composite index? Write the `@@index` declaration and the migration command.

**Visual:** Query execution plan diagram — without `createdAt` index: "Filter rows → sort ALL matching rows in memory → LIMIT". With index: "Filter rows → B-tree gives rows already sorted → LIMIT". Annotate the sort step as the bottleneck.

---

## Slide 3 of 3 — The Hardening Layer: Course Wrap-Up

**Headline:** The difference between a demo and a production system is the hardening layer.

**Talking points:**
- Let's close the loop. Here is the full picture of what "hardened" means in PrismApp:

| Property | What implements it |
|---|---|
| **Identity verification** | `getAuthContext` → `getToken` → JWT cryptographic check. No DB hit per request. |
| **Role enforcement** | `requireMutationRole` / `requireReadRole` at the first line of every handler. |
| **Structured error responses** | `fromUnknownError` classifies every error. Client always gets `ApiEnvelope`. |
| **Request correlation** | `proxy.ts` injects `x-request-id`. Logs and responses carry the same ID. |
| **Brute-force protection** | Rate limit on `POST /api/auth/callback/credentials`. 10 attempts / 15 min / IP. |
| **Audit trail** | `writeAuditLog` after every mutation. Before/after diff for updates. |
| **Error alerting** | Sentry captures unhandled errors. 10% performance trace sampling in production. |
| **Query performance** | `@@index` declarations on every filter/sort column. Composite indexes for multi-column patterns. |

- This table is also a review checklist for adding any new module. Copy the module, fill in the table. If any row is blank, the module is not production-ready.

- **The course arc, completed:**
  - Section A: What to build and why. Scope drives every decision downstream.
  - Section B: The data model. Right constraints prevent wrong data.
  - Section C: The technology choices. Each choice was made for a reason.
  - Section D: CRUD patterns. Six operations, repeatable across every module.
  - Section E: The hardening layer. What separates "it works" from "it's safe."

- The best next step is to take a project you are already working on and apply the hardening checklist. Not to rewrite it — to audit it. How many route handlers are missing `requireReadRole`? How many mutations have no audit log? How many slow queries are waiting for an index?

**Visual:** The eight-row table above, rendered cleanly. Below: the five-section course arc as a horizontal timeline, each section with its one-sentence summary. Final caption: "You now have the full stack — from requirements to production."

**Section E complete. Course complete.**
