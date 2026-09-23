# Playlist D · Episode 6 — "Aggregation and Reporting Queries"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Querying at Scale (2 of 2)
- **Target length:** 5–7 minutes
- **Primary goal:** Show how Prisma's typed aggregate API produces consistent
  totals for a real report, and be honest that this codebase has no raw SQL or
  window functions — the typed API has been enough so far.
- **Title options:**
  1. Aggregation and Reporting Queries
  2. Five Queries, One Snapshot
  3. Do You Need a Window Function? (Not Yet)
- **Thumbnail concept:** Five small query boxes flowing into one `$transaction([
  ])` bracket, flowing out to a single report table.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "A report is rarely one query. It's a page of rows, a total count for
> pagination, a grand total amount, and sometimes a couple of summary breakdowns —
> and all of them need to agree with each other, even if the underlying data is
> changing every second. Here's how this app keeps five queries in sync."

---

## Scene 1 — Five queries, one transaction (0:20–1:45)

**Visual:** Open `src/modules/reports/contributions-reports.service.ts`, the
`db.$transaction([...])` array, ~lines 229–260.

**Code shown:**
```ts
const [items, totalItems, totalAmountAggregate, unitRows, payerRows] = await db.$transaction([
  db.contributionDetail.findMany({ where, /* ... */ skip, take: params.pageSize }),
  db.contributionDetail.count({ where }),
  db.contributionDetail.aggregate({ where, _sum: { amt: true } }),
  db.contribution.findMany({ where: { /* ... */ } }),
  // ...
]);
```

**Narration:**
> "This is Episode 4's array-form `$transaction`, applied to reads. `items` is the
> current page of rows. `totalItems` is the count, for pagination. `totalAmountAggregate`
> is a sum. All three run against the *same* database snapshot, inside one
> transaction — so the total can never disagree with the rows it's supposed to be
> the total of, even if someone else is writing a new contribution at that exact
> moment. Without the transaction, each query could see a slightly different
> version of the table, and the numbers on screen could quietly stop adding up."

---

## Scene 2 — Prisma's typed aggregate, not raw SQL (1:45–3:00)

**Visual:** Highlight `db.contributionDetail.aggregate({ where, _sum: { amt: true } })`.

**Narration:**
> "`_sum: { amt: true }` is Prisma's typed aggregation API — the equivalent of SQL's
> `SUM(amt)`, but the result comes back as a typed object, not a row you have to
> parse. This app never drops into a raw `SELECT SUM(...)` string for this — the
> typed API expresses everything this report needs: sums, counts, and filtered
> row sets, all fully type-checked against the schema."

---

## Scene 3 — Being honest about what isn't here (3:00–4:15)

**Visual:** A search/grep result showing zero matches for `$queryRaw` or
`$executeRaw` in `src/` or `app/`, apart from one line in a health-check route.

**Narration:**
> "Worth saying plainly: this codebase has no window functions — no `OVER`, no
> `PARTITION BY` — and essentially no raw SQL. The one exception is a single
> `SELECT 1` in a health-check endpoint, which we'll look at in Episode 8, and
> that's just confirming the database is reachable, not answering a domain
> question. Every report in this app has been answerable with `findMany`,
> `count`, and `aggregate`. If a future report needed something like 'a running
> balance per unit, ordered by transaction date' — a genuinely row-over-row
> calculation — that's the point where a window function would earn its place, and
> Prisma's `$queryRaw` would be the honest way to reach for one. That need hasn't
> shown up yet."

---

## Scene 4 — Why that restraint is a feature, not a gap (4:15–5:00)

**Narration (no new visual, talking head over a static shot of the schema):**
> "It would be easy to reach for raw SQL the moment a report gets slightly
> complex. This app hasn't needed to, and that's worth noticing: staying inside
> Prisma's typed query API means every one of these reporting queries is checked
> against the schema at compile time, benefits from the connection and transaction
> handling we've already seen, and never needs separate SQL-injection review the
> way a hand-built query string would. Raw SQL is a tool to reach for when the
> typed API genuinely can't express what you need — not a default."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "Every query we've looked at assumes the schema already matches the database.
> Next: how a schema change actually becomes a real migration, safely."

---

## Production Notes

- **Screen recordings needed:** `src/modules/reports/contributions-reports.service.ts`
  (`$transaction` array, ~lines 229–260, and the `aggregate` call within it).
- **Source material:** the file above, plus a grep for `\$queryRaw|\$executeRaw`
  across `src/` and `app/` (only match: `app/api/health/route.ts`), read directly
  from the repository.
- **B-roll:** none required.
- **Fact-check before recording:** re-run the `$queryRaw`/`$executeRaw` grep if
  significant time has passed since this script was written — if a future report
  adds raw SQL or a window function, this episode's "we haven't needed one yet"
  framing should be updated rather than re-recorded as-is.
