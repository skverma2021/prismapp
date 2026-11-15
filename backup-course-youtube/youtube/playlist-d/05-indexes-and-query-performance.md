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
> "An index isn't free — every one you add slows down writes a little, to speed up
> a matching read a lot. So the only good reason to add one is a real query that
> needs it. Let's line up the indexes in this schema against the actual queries
> that use them."

---

## Scene 1 — The report filters, as a form (0:20–1:15)

**Visual:** A contribution transactions report screen — filters for unit, block,
contribution head, depositor, and a date range.

**Narration:**
> "Here's a real screen: the contributions transactions report. A user can filter
> by unit, by block, by which contribution head, by who deposited it, and by a
> date range. Every one of those is a `WHERE` clause condition — and every one of
> them needs to not scan the entire `contributions` table to answer."

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
> "Four indexes, four filters. `unitId` combined with `contributionHeadId`, because
> the report often filters by both together — a compound index like this is faster
> for that combined lookup than two separate single-column indexes would be.
> `contributionHeadId` alone, for when only the head matters. `transactionDateTime`
> for the date-range filter. `depositedBy` for filtering by who paid. None of these
> exist because 'more indexes seemed safer' — each one maps to a filter a real user
> screen actually offers."

---

## Scene 3 — The where clause that proves it (2:30–3:45)

**Visual:** Open `src/modules/reports/contributions-reports.service.ts`, the
`where` object inside `getContributionTransactionsReport`, ~lines 200–220.

**Narration:**
> "And here's the other half — the actual query. `params.headId` becomes
> `contributionHeadId`, `params.unitId` becomes `unitId`, `params.blockId` reaches
> through the relation to `unit.blockId`, `params.depositedBy` becomes
> `depositedBy`, and the date range becomes a `gte`/`lte` range on
> `transactionDateTime`. Every field in this `where` object has a matching index
> back in the schema. If a new filter got added to this report — say, filtering by
> `correctionStatus` — and nobody added a matching index, that's the moment this
> report would start getting slow as the table grows, and nobody would notice until
> it did."

---

## Scene 4 — The same discipline for temporal overlap queries (3:45–4:45)

**Visual:** Re-show `UnitOwner`'s `@@index([unitId, fromDt, toDt])` from Episode 2,
next to the overlap-check query from Episode 3/4 that reads `unitOwner.findMany({
where: { unitId, ... } })`.

**Narration:**
> "This isn't unique to reports. Episode 4's overlap check runs on every single
> ownership write — so its index isn't optional, it's on the hot path for every
> ownership transaction this app processes. The rule is the same either way: an
> index should exist because a specific, identifiable query needs it, and you
> should be able to point at that query."

---

## Outro / CTA (4:45–5:15)

**Visual:** End card pointing to Episode 6.

**Narration:**
> "Filtering fast is half the reporting problem. The other half is turning
> hundreds of matching rows into one total, one count, one summary — and that's
> next."

---

## Production Notes

- **Screen recordings needed:** `prisma/schema.prisma` `Contribution` model's
  `@@index` lines, `src/modules/reports/contributions-reports.service.ts`
  (`getContributionTransactionsReport`, `where` object, ~lines 200–220), a report
  UI screenshot/recording showing the filter form (unit/block/head/depositor/date
  range) if available from the app.
- **Source material:** the files above, read directly from the repository.
- **B-roll:** none required.
