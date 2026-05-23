# E-03 — Audit Logging: What to Capture and When

---

## Slide 1 of 3 — What the Audit Log Records

**Headline:** The audit log is the answer to "who did what to which record, and when?"

**Talking points:**
- An audit log is not a debug log. It is not `console.log`. It is a durable, structured record of business-significant mutations — the kind of record a compliance reviewer or an accountant might ask for.
- Open `src/lib/audit-log.ts`. The shape of every entry:

```typescript
type AuditEntry = {
  actorUserId: string;   // who
  actorRole:   string;   // in what capacity
  action:      string;   // what (e.g., BLOCK_CREATED, OWNERSHIP_TRANSFERRED)
  entityType:  string;   // which kind of record (Block, Unit, Contribution...)
  entityId:    string;   // which specific record
  payload?:    Prisma.InputJsonValue; // the data
};
```

- The `payload` field carries different content depending on the action:
  - **Create:** the full input — so you can see what was submitted.
  - **Update:** a `{ before, after }` diff — so you can see exactly what changed.
  - **Delete:** the key of what was deleted.
  - **Correction:** the correction reason code, reason text, and reference to the original contribution.

- Example — after `updateBlock`:

```typescript
await writeAuditLog(db, {
  actorUserId: actor.userId,
  actorRole:   actor.role,
  action:      "BLOCK_UPDATED",
  entityType:  "Block",
  entityId:    id,
  payload: {
    before: { description: before.description },
    after:  { description: result.description },
  },
});
```

- Now the audit log entry for that operation reads: "User `usr_abc123` (MANAGER) updated Block `blk_xyz` — description changed from 'Block A' to 'Block G'." That is auditable.

**Visual:** A rendered audit log row from the `/audit-log` page, with each column annotated: `actorUserId` → "who", `actorRole` → "in what capacity", `action` → "what", `entityId` → "which record", `payload` → "what changed (before/after)".

**Takeaway: The audit log entry must answer five questions: who, in what capacity, what action, on which record, and what exactly changed.**

---

## Slide 2 of 3 — Why Audit Writes Are Outside the Transaction

**Headline:** An audit failure must never roll back a contribution. The audit log is secondary. The business write is primary.

**Talking points:**
- Look at how `createOwnership` is structured:

```typescript
// src/modules/ownerships/ownerships.service.ts

export async function createOwnership(input, actor) {
  // Business write — inside the transaction
  const result = await db.$transaction(async (tx) => {
    await ensureOwnershipReferencesExist(tx, ...);
    await ensureNoOwnershipOverlap(tx, ...);
    await ensureOwnershipContinuity(tx, ...);
    return await tx.unitOwner.create({ data: ... });
  }, { isolationLevel: "ReadCommitted" });

  // Audit write — OUTSIDE the transaction, using db not tx
  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole:   actor.role,
    action:      "OWNERSHIP_CREATED",
    entityType:  "UnitOwner",
    entityId:    result.id,
    payload:     { ... },
  });

  return result;
}
```

- The `writeAuditLog` call uses `db`, not `tx`. It runs after the transaction has already committed. This is deliberate.
- The comment in `audit-log.ts` explains it:
  > "Driver adapters (@prisma/adapter-pg) do not guarantee atomicity for interactive transactions, so audit writes are performed outside the business-logic transaction. Failures are logged but never propagate to the caller — the contribution row itself already carries actorUserId / actorRole as the primary audit trail."

- If the audit log write fails (a transient database error, a constraint violation in the audit table), the `writeAuditLog` function catches the error and logs it to the console. It does not re-throw. The ownership record was already committed — it stands.
- Why is this acceptable? Because the contribution/ownership row itself carries `actorUserId` and `actorRole`. The entity table is the primary audit trail. The `AuditLog` table is a secondary, queryable index over those events. A gap in the audit log is a monitoring alert — it is not a reason to roll back a valid financial write.

**Visual:** Sequence diagram — `$transaction` commits (commitment line) → `writeAuditLog` runs → success (normal path) vs catch+log (failure path). Annotate: "Transaction already committed. Audit failure does not undo it."

**Takeaway: Business writes and audit writes are intentionally decoupled. The transaction boundary is around the data, not around the audit.**

---

## Slide 3 of 3 — Audit Log Indexes and Querying

**Headline:** An audit log without indexes is a write-only ledger. You can record everything but find nothing.

**Talking points:**
- Open `prisma/schema.prisma`. The `AuditLog` model has three indexes:

```prisma
model AuditLog {
  id          String   @id @default(cuid())
  createdAt   DateTime @default(now())
  action      String
  entityType  String
  entityId    String
  actorRole   String
  actorUserId String
  payload     Json?

  @@index([entityType, entityId])   // "what happened to Block blk_xyz?"
  @@index([actorUserId])             // "what did user usr_abc do?"
  @@index([createdAt])               // "what happened between 09:00 and 17:00?"
}
```

- Three query patterns, three indexes. Each index supports exactly one access pattern:
  - `[entityType, entityId]` — the entity history query: filter by `entityType = "Block" AND entityId = "blk_xyz"`. Gets the full history of one record. Composite index because both columns are in the `WHERE` clause.
  - `[actorUserId]` — the user activity query: filter by `actorUserId = "usr_abc"`. Shows everything a user has done.
  - `[createdAt]` — the time-range query: filter by `createdAt BETWEEN ? AND ?`. The audit log page's default sort is `createdAt DESC`.

- The audit log page supports all three filter patterns. Without the indexes, each query would scan the entire audit log table — which, after one year of production use with hundreds of mutations per day, could be 50,000+ rows.

- One important non-index: there is no `@@index([action])`. Filtering by action alone (e.g., "all CONTRIBUTION_CREATED events") is a secondary use case — it is typically combined with a time range or entity type, so the `[createdAt]` or `[entityType, entityId]` index is used. Adding a standalone `[action]` index would have a write cost without a proportional read benefit.

**Visual:** Three query cards, each showing a `WHERE` clause and the index it uses. Below: a small table showing "index has cost on INSERT" — annotate that every index you add slows writes slightly. Write-heavy systems choose indexes carefully.

**Takeaway: Design indexes for the queries you will run. A composite index on `[entityType, entityId]` serves entity history lookups. Three indexes, three access patterns, no guesswork.**
