# Playlist D · Episode 5 — "Indexes and Query Performance"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Querying at Scale (1 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Connect the `@@index` declarations from Episode 2 to the real
  `where` clauses that actually use them, so indexing stops looking like guesswork.
- **Title options:**
  1. Indexes and Query Performance
  2. An Index Is a Promise About How You'll Query
  3. Why These Three Columns, Together
- **Thumbnail concept:** A report filter form (unit / block / head / date range) with
  arrows connecting each filter field to a matching `@@index([...])` line in the
  schema.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "An index is not free.
> Every index you add slows down writes a little, to speed up a matching read a lot.
>
> So the only good reason to add one is a real query that needs it.
>
> Let us line up the indexes in this schema against the actual queries that use them."

---

## Scene 1 — The report filters, as a form (0:20–1:15)

**Visual:** A contribution transactions report screen — filters for unit, block,
contribution head, depositor, and a date range.

**Narration:**
> "Here is a real screen: the contributions transactions report.
>
> A user can filter by unit, by block, and by which contribution head. They can filter by who deposited it, and by a date range.
>
> Every one of those is a `WHERE` clause condition.
> And every one of them must answer without scanning the entire `contributions` table."

---

## Scene 2 — The index that backs it (1:15–2:30)

**Visual:** Open `prisma/schema.prisma`, `Contribution` model's index block.

**Code shown:**
```prisma
model Contribution {
  // ...
  @@index([unitId, contributionHeadId])
  @@index([contributionHeadId])
  @@index([transactionDateTime])
  @@index([depositedBy])
}
```

**Narration:**
> "There are four indexes, for four filters.
>
> First, `unitId` combined with `contributionHeadId`. The report often filters by both together.
> A compound index like this is faster for that combined lookup than two separate single-column indexes.
>
> Second, `contributionHeadId` alone, for when only the head matters.
> Third, `transactionDateTime`, for the date-range filter.
> And fourth, `depositedBy`, for filtering by who paid.
>
> None of these exist because 'more indexes seemed safer'.
> Each one maps to a filter that a real user screen actually offers."

---

## Scene 3 — The where clause that proves it (2:30–3:45)

**Visual:** Open `src/modules/reports/contributions-reports.service.ts`, the
`where` object inside `getContributionTransactionsReport`, ~lines 200–220.

**Narration:**
> "Here is the other half: the actual query.
>
> `params.headId` becomes `contributionHeadId`. `params.unitId` becomes `unitId`.
> `params.blockId` reaches through the relation to `unit.blockId`. `params.depositedBy` becomes `depositedBy`.
> And the date range becomes a `gte` and `lte` range on `transactionDateTime`.
>
> Every field in this `where` object has a matching index back in the schema.
>
> Now suppose someone adds a new filter to this report, for example `correctionStatus`. And nobody adds a matching index.
> That is the moment this report would start getting slow as the table grows.
> And nobody would notice until it did."

---

## Scene 4 — The same discipline for temporal overlap queries (3:45–4:45)

**Visual:** Re-show `UnitOwner`'s `@@index([unitId, fromDt, toDt])` from Episode 2,
next to the overlap-check query from Episode 3/4 that reads `unitOwner.findMany({
where: { unitId, ... } })`.

**Narration:**
> "This is not unique to reports.
>
> The overlap check from Episode 4 runs on every single ownership write.
> So its index is not optional. It is on the hot path for every ownership transaction this app processes.
>
> The rule is the same either way.
> An index should exist because a specific, identifiable query needs it. And you should be able to point at that query."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 6.

**Narration:**
> "Filtering fast is half the reporting problem.
>
> The other half is turning hundreds of matching rows into one total, one count, and one summary.
>
> That is next."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` `Contribution` model's
  `@@index` lines, `src/modules/reports/contributions-reports.service.ts`
  (`getContributionTransactionsReport`, `where` object, ~lines 200–220), a report
  UI screenshot/recording showing the filter form (unit/block/head/depositor/date
  range) if available from the app.
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
