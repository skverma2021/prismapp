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
> "A report is rarely one query.
>
> It is a page of rows. A total count for pagination. A grand total amount.
> Sometimes a few summary breakdowns.
>
> And all of them must agree with each other, even when the data changes every
> second.
>
> Here is how this app keeps five queries in sync."

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
> "This is the array form of `$transaction` from Episode 4, now used for reads.
>
> `items` is the current page of rows.
> `totalItems` is the count, for pagination.
> `totalAmountAggregate` is a sum.
>
> All three run against the *same* database snapshot, inside one transaction.
>
> So the total can never disagree with its rows. Even if someone saves a new
> contribution at that exact moment.
>
> Without the transaction, each query could see a slightly different version of
> the table. The numbers on screen could quietly stop adding up."

---

## Scene 2 — Prisma's typed aggregate, not raw SQL (1:45–3:00)

**Visual:** Highlight `db.contributionDetail.aggregate({ where, _sum: { amt: true } })`.

**Narration:**
> "`_sum: { amt: true }` is Prisma's typed aggregation API.
>
> It is the equivalent of SQL's `SUM(amt)`. But the result comes back as a typed
> object. Not a row you have to parse.
>
> This app never drops into a raw `SELECT SUM(...)` string for this.
>
> The typed API covers everything this report needs. Sums, counts, and filtered
> row sets. All of it is type-checked against the schema."

---

## Scene 3 — Being honest about what isn't here (3:00–4:15)

**Visual:** A search/grep result showing zero matches for `$queryRaw` or
`$executeRaw` in `src/` or `app/`, apart from one line in a health-check route.

**Narration:**
> "Let me say this plainly.
>
> This codebase has no window functions. No `OVER`. No `PARTITION BY`. And
> essentially no raw SQL.
>
> There is one exception. A single `SELECT 1` in a health-check endpoint. We will
> look at it in Episode 8. It only confirms that the database is reachable. It
> does not answer a domain question.
>
> Every report in this app can be answered with `findMany`, `count`, and
> `aggregate`.
>
> Now suppose a future report needs a running balance per unit, ordered by
> transaction date. Each row would depend on the rows before it. That is where a
> window function becomes useful. In Prisma, you would use `$queryRaw` to write it.
>
> That need has not shown up yet."

---

## Scene 4 — Why that restraint is a feature, not a gap (4:15–5:00)

**Narration (no new visual, talking head over a static shot of the schema):**
> "It is easy to reach for raw SQL as soon as a report gets a little complex.
> This app has not needed to. That is worth noticing.
>
> Staying inside Prisma's typed query API gives us three benefits.
>
> Every reporting query is checked against the schema at compile time.
> It uses the connection and transaction handling we have already seen.
> And there is no hand-built query string, so there is no separate SQL-injection
> review.
>
> Raw SQL is a tool for when the typed API truly cannot express what you need.
> It is not a default."

---

## Outro / CTA (5:00–5:30)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "Every query we have looked at assumes the schema already matches the database.
>
> In the next episode, we see how a schema change becomes a real migration, safely."

---

## Production Notes

- **Screen recordings needed:** `src/modules/reports/contributions-reports.service.ts`
  (`$transaction` array, ~lines 229–260, and the `aggregate` call within it).
- **Source material:** the file above, plus a grep for `\$queryRaw|\$executeRaw`
  across `src/` and `app/` (only match: `app/api/health/route.ts`), read directly
  from the repository.
- **B-roll:** none required.
- **Voice-over format:** narration is written in short spoken sentences. A blank
  (`>`) line inside a narration block means pause and breathe. Lines inside one
  paragraph are short phrases you can read in one breath.
- **Fact-check before recording:** re-run the `$queryRaw`/`$executeRaw` grep if
  significant time has passed since this script was written — if a future report
  adds raw SQL or a window function, this episode's "we haven't needed one yet"
  framing should be updated rather than re-recorded as-is.
