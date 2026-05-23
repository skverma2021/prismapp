# E-05 — Database Indexes: From Slow to Fast

---

## Slide 1 of 3 — Why Indexes Exist

**Headline:** Without an index, every query reads every row. With an index, it reads only the matching rows.

**Talking points:**
- A database index is a sorted data structure — a B-tree — maintained alongside the table. When a query has a `WHERE` clause, PostgreSQL checks whether an index covers the filter columns. If it does, it uses the B-tree to jump directly to the matching rows instead of scanning the whole table.
- Without an index, a query like `SELECT * FROM units WHERE blockId = 'blk_abc'` reads every row in the `units` table, compares `blockId` to `'blk_abc'`, and discards non-matches. On a 10,000-row table, that is 10,000 row reads.
- With `@@index([blockId])`, the same query does a B-tree lookup — O(log n) — and retrieves only the matching rows. On a 10,000-row table, that is roughly 14 comparisons.
- The cost: every index adds overhead to INSERT, UPDATE, and DELETE — the B-tree must be updated to reflect the new data. A table with 10 indexes takes roughly 10× longer to write to than a table with no indexes. Choose indexes based on query patterns, not "more is better."

- Now look at the `Unit` model in `prisma/schema.prisma`:

```prisma
model Unit {
  id          String   @id @default(uuid())
  description String
  blockId     String
  sqFt        Int
  ...

  @@unique([blockId, description])  // uniqueness constraint (also an index)
  @@index([blockId])                // filter units by block — the list page filter
}
```

- `@@unique([blockId, description])` is both a constraint and an implicit index.
- `@@index([blockId])` is the explicit index for `WHERE blockId = ?` — used by the units list page when filtered by block.
- Together, these two definitions cover the two most common access patterns for units: uniqueness enforcement and list-by-block.

**Visual:** Bar chart comparison — query runtime (ms) on 10,000 rows. Without index: full table scan, high latency. With index: B-tree lookup, low latency. Annotate: "The difference is invisible at 100 rows. It becomes critical at 10,000."

**Takeaway: Indexes make read queries fast. They have a write cost. Add them for the columns you filter or sort by most often.**

---

## Slide 2 of 3 — Temporal Indexes: The Ownership and Contribution Pattern

**Headline:** The most interesting indexes are the ones that support overlap checks and range queries.

**Talking points:**
- Open `prisma/schema.prisma`. The `UnitOwner` (ownership) model:

```prisma
model UnitOwner {
  id      String    @id @default(uuid())
  unitId  String
  indId   String
  fromDt  DateTime
  toDt    DateTime?  // null = current owner
  ...

  @@index([unitId, fromDt, toDt])  // overlap check: "any ownership for unit X during date range Y-Z?"
  @@index([indId, fromDt, toDt])   // "all units owned by individual X over time?"
}
```

- The overlap check in `ensureNoOwnershipOverlap` queries:
  ```sql
  WHERE unitId = ? AND (toDt IS NULL OR toDt >= startDate) AND fromDt <= endDate
  ```
  This is a range intersection test. The `[unitId, fromDt, toDt]` composite index means PostgreSQL can use the B-tree to narrow to the relevant `unitId` first, then check the date range — much faster than a full scan.

- The `Contribution` model has the most indexes because it is the most-queried table:

```prisma
model Contribution {
  id                     Int       @id @default(autoincrement())
  unitId                 String
  contributionHeadId     Int
  transactionDateTime    DateTime
  depositedBy            String
  correctionOfContributionId Int?
  ...

  @@index([unitId, contributionHeadId])     // month ledger: "paid months for unit X, head Y"
  @@index([contributionHeadId])              // head-level aggregation
  @@index([transactionDateTime])             // transactions report: date range filter
  @@index([depositedBy])                     // "all payments by person X"
  @@index([correctionOfContributionId])      // "find the correction for contribution Z"
}
```

- Each index maps directly to a report or query:
  - `[unitId, contributionHeadId]` → the contribution capture page's month ledger: fetch all contributions for a specific unit+head combination.
  - `[transactionDateTime]` → the transactions report's date range filter.
  - `[correctionOfContributionId]` → looking up whether a contribution has been corrected.

- The `ContributionDetail` model:

```prisma
@@index([contributionPeriodId])    // "which contributions cover period Jan-2026?"
@@index([contributionRateId])      // "which contributions used rate version 3?"
```

**Visual:** Table of indexes from the schema, each with a one-line annotation of the query it supports. Use two columns: "Index" and "Query it enables."

**Takeaway: Each index in the schema was added for a specific query. Trace every `@@index` to the query pattern it accelerates.**

---

## Slide 3 of 3 — The Index You Don't Add

**Headline:** Knowing when NOT to add an index is as important as knowing when to add one.

**Talking points:**
- Look at the `AuditLog` model. It has three indexes: `[entityType, entityId]`, `[actorUserId]`, `[createdAt]`. Notice what it does NOT have: `@@index([action])`.

- Why not? The `action` field has values like `BLOCK_CREATED`, `OWNERSHIP_TRANSFERRED`, `CONTRIBUTION_CREATED`. An admin reviewing the audit log might want to filter by action — "show me all CONTRIBUTION_CORRECTION_CREATED events."

- The reason not to add it:
  1. The cardinality is low — there are about 20 distinct action values in the whole system. A low-cardinality index is less effective because many rows share the same value; the B-tree still has to retrieve a large fraction of the table.
  2. The query is always combined with a time range or entity filter — the `[createdAt]` or `[entityType, entityId]` index already narrows the result set significantly. Filtering by `action` on top of that is cheap.
  3. Every index adds write overhead. Adding a low-value index penalizes every audit log write.

- This is the general principle: **high-selectivity columns make good indexes**. A `unitId` index is highly selective — there may be 200 units, so filtering by unit reduces the result set to 0.5% of the table. An `action` index is low-selectivity — 20 action types, each covering 5% of the table.

- One more pattern to know: **composite vs separate indexes**. `@@index([unitId, fromDt, toDt])` is NOT the same as three separate indexes `@@index([unitId])`, `@@index([fromDt])`, `@@index([toDt])`. The composite index supports queries that filter on all three columns together — specifically the overlap check `WHERE unitId = ? AND fromDt <= ? AND toDt >= ?`. Three separate indexes would not help that query.

**Visual:** Two-column table — left: "Index we added + selectivity note." Right: "Index we skipped + reason." Three rows for each column. Bottom callout: "Composite index is NOT the same as three separate indexes."

**Takeaway: High-selectivity columns make good indexes. Low-selectivity columns usually don't justify the write overhead. Composite indexes serve multi-column filter queries that separate indexes cannot.**
