# D-04 — Transactions and Complex Writes

---

## Slide 1 of 3 — When a Single Prisma Call Is Not Enough

**Headline:** If your write depends on reading first, and another request can write between your read and your write, you have a race condition.

**Talking points:**
- Most CRUD operations are atomic by themselves: `db.block.create()` either inserts the row or throws — no intermediate state.
- But some domain rules require a **check-then-write** pattern:
  - Before creating an ownership record: check that the new date range doesn't overlap any existing ownership for the same unit.
  - Before creating a contribution: check that no duplicate entry exists for the same unit + head + period.
- The problem with application-level checks:

```
Request A:                              Request B (concurrent):
  read: no overlapping ownerships         read: no overlapping ownerships
  ← time passes →                        ← same window →
  write: create ownership (fromDt=Jan 1)  write: create ownership (fromDt=Jan 1)
  → both succeed → OVERLAP IN DATABASE
```

- Both requests read a clean state, both pass the check, and both write. The database ends up with two overlapping ownership records — a domain rule violation that the database-level constraint cannot prevent (temporal overlap is not expressible as a `UNIQUE` index).
- The fix: both the read and the write must happen inside a single **transaction**.

**Visual:** Two parallel timelines showing the race window. Label the gap between read and write. Show how a transaction collapses the two into a serialized sequence.

**Takeaway:** Any check-then-write operation must be atomic. If the read and the write are in separate database calls, a concurrent request can invalidate the check before the write completes.

---

## Slide 2 of 3 — `$transaction(async tx => ...)` for Check-Then-Write

**Headline:** The transaction callback gives every operation inside it the same database snapshot.

**Talking points:**
- Open `src/modules/ownerships/ownerships.service.ts` → `createOwnership`. Find the transaction block:

```typescript
export async function createOwnership(input: CreateOwnershipInput, actor: AuthContext) {
  const result = await db.$transaction(
    async (tx) => {
      // All three checks and the write use the SAME tx
      const unit = await ensureOwnershipReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Ownership start date");
      await ensureNoOwnershipOverlap(tx, input.unitId, input.fromDt, input.toDt ?? null);
      await ensureOwnershipContinuity(tx, input.unitId, unit.inceptionDt, {
        fromDt: input.fromDt,
        toDt: input.toDt ?? null,
      });
      return tx.unitOwner.create({ data: { ... } });
    },
    { isolationLevel: "ReadCommitted" }
  );

  await writeAuditLog(db, { ... });
  return result;
}
```

- Everything inside the `async (tx) => {}` callback shares the same database transaction. The `tx` object is a Prisma client scoped to the transaction — it is passed into every helper function that needs to query.
- `ensureNoOwnershipOverlap(tx, ...)` reads `tx.unitOwner.findMany(...)`. Because this uses `tx` (not `db`), it reads within the transaction boundary. The subsequent `tx.unitOwner.create(...)` also runs within the same boundary. No other request can insert between them.
- If any operation inside the callback throws, the entire transaction is rolled back — the row is never created, the check result is discarded, and nothing is written to the database.
- `isolationLevel: "ReadCommitted"` is the default PostgreSQL isolation level. For PrismApp's overlap checks, this is sufficient — the check and write are in the same transaction, so no concurrent write can sneak in between them.
- Note that `writeAuditLog` is called **after** the transaction, using `db` (not `tx`). The audit log is written after the business transaction commits. This is intentional — if the audit log write fails, the business data is already committed. Audit log failures are logged but do not roll back the business operation.

**Contrast the two `$transaction` forms:**

| Form | When to use |
|---|---|
| `db.$transaction([query1, query2])` | Parallel read + count (same snapshot, no logic between them) |
| `db.$transaction(async tx => {...})` | Check-then-write (reads and writes must share a boundary) |

**Visual:** Two diagrams side by side. Left: `$transaction([...])` as a batch envelope — two arrows entering together. Right: `$transaction(async tx => ...)` as a sequenced callback — check, write, commit/rollback flow.

**Takeaway:** The callback form of `$transaction` is the correct pattern for check-then-write. Every helper that queries the database inside the callback must accept and use the `tx` parameter, not the global `db`.

---

## Slide 3 of 3 — Multi-Row Writes: The Contribution Header + Detail

**Headline:** A payment that spans three months must write four rows atomically — or none.

**Talking points:**
- Open `src/modules/contributions/contributions.service.ts`. The `createContribution` function writes:
  1. One `Contribution` header row (unit, head, quantity, transactionId, depositedBy, actorUserId, actorRole)
  2. N `ContributionDetail` rows — one per selected period (the amount per period, the locked rate)

- These N+1 rows are a single business event. If the header is written but two of the three detail rows fail (perhaps due to a duplicate period violation), the database is left in an inconsistent state — a contribution header with missing periods.
- The fix: all N+1 writes are inside a single `$transaction(async tx => ...)`. The duplicate period check runs inside the transaction as well.
- Conceptually:

```
db.$transaction(async (tx) => {
  // 1. Validate: check for duplicate periods (inside tx)
  await checkDuplicatePeriods(tx, input.unitId, input.headId, input.periodIds);

  // 2. Resolve rate (inside tx — consistent rate read)
  const rate = await resolveApplicableRate(tx, input.headId, input.transactionDateTime);

  // 3. Write header
  const header = await tx.contribution.create({ data: { ...headerData } });

  // 4. Write detail rows (one per period)
  await tx.contributionDetail.createMany({
    data: input.periodIds.map((periodId) => ({
      contributionId: header.id,
      contributionPeriodId: periodId,
      amt: roundTo2(quantity * rate.amt),
    })),
  });

  return header;
});
```

- If the `createMany` fails for any period (e.g., a unique constraint violation), the entire transaction rolls back — no header, no partial details.
- This is the domain rule from `vault/01-Domain/Domain-Rules.md` Financial Integrity Rules 1–2: "Contributions are immutable once recorded. ContributionDetails cannot be modified after creation." You cannot modify them because they were written correctly the first time — atomically.

**Visual:** Multi-row write diagram: one transaction envelope containing 1 header row + 3 detail rows. Show that a failure in row 3 causes all four to roll back.

**Takeaway:** Any write that creates multiple logically related rows must be wrapped in a single `$transaction` callback. Partial writes leave the database inconsistent and violate domain rules.

**Transition to D-05:** "We've built the server side — list, create, get, update, delete, and complex transactional writes. Now let's look at the client-side patterns that wire all of this to a usable UI."
