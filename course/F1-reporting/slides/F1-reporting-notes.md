# Section F1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# Speaker Notes — Module F: Contribution Reporting

These notes are for Camtasia recording. Each note maps to a slide or demo segment. Format: `F-[topic]-[slide]`.

---

## F-01-01 — Why Two Reports?

*[SLIDE: "Why Two Reports?" — Matrix vs Transactions]*

The app has two reports and they solve different problems.

The **Paid/Unpaid Matrix** is for management: "I need to see which flats owe money this month." It's a coverage grid — unit by period — colored green or amber.

The **Transactions Report** is for audit: "Show me exactly what was recorded, by whom, when." It's a flat list of individual payment detail rows.

Both require login. Any of the three roles — Admin, Manager, Read-Only — can see reports.

[Switch to app] Here are both report cards on the dashboard. I'll click into the Matrix first — you can see the grid. Then the Transactions — a table of records.

---

## F-01-02 — Architecture: Three Layers

*[SLIDE: Architecture flow diagram]*

Every report follows the same three-layer flow you've seen in the CRUD modules.

The **page** is a Client Component. It holds filter state, fetches the API, renders the table. No server state. No SSR. Just browser fetch.

The **route handler** is 10–15 lines. It authenticates, parses params, calls the service, returns the response.

The **service** is where all logic lives — the one big file `contributions-reports.service.ts`.

If you need to change what a report filters, you change the service. The route handler stays the same.

[Show in VS Code] Here's the matrix route handler. 15 lines. Here's the service — much longer. That's the intentional split.

---

## F-01-03 — ContributionDetail Grain

*[SLIDE: ERD fragment — Contribution → ContributionDetail]*

Before you can understand either report, you need to understand the grain.

A single payment creates:
- One `Contribution` — the transaction header
- One or more `ContributionDetail` rows — one per period covered

If someone pays three months at once, there is one contribution and three detail rows.

Reports are built from `ContributionDetail` — not `Contribution` — because that's the per-period level. The matrix asks "is month X paid?" — that's a detail-level question.

[Show in service] Line 1 of `getContributionTransactionsReport`: `db.contributionDetail.findMany`. Not `db.contribution`. Detail-level from the start.

---

## F-02-01 — Transactions Filters

*[SLIDE: Nine filters table]*

The transactions report accepts nine parameters. Only year is required.

Required: `refYear` — which year's periods to show.

Optional: month, head, unit, block, depositor, date range start, date range end, sort.

All parsing and validation happens in `parseTransactionsReportParams` — before any database query. Invalid params throw a `400`. The database never sees them.

[Show in service] Here's the parse function. See the `parseInt` calls, the allowlist check for `sortBy`, and the date range validation. All synchronous. No DB call.

---

## F-02-02 — Five Parallel Queries

*[SLIDE: db.$transaction array with 5 items]*

Inside the service function, five queries run simultaneously using `db.$transaction([...])`.

Each serves one purpose:

1. Paginated detail rows — what the table shows
2. Total count — how many rows match (for pagination)
3. Aggregate sum — total amount across ALL pages
4. Distinct unit IDs — how many distinct units
5. Distinct depositor IDs — how many distinct payers

Critical: queries 3, 4, and 5 do NOT have `skip`/`take`. They always count the full dataset, regardless of which page you're on. That's how totals stay accurate across pagination.

[Show code] Here's the array. Items has `skip` and `take`. The aggregate and distinct queries don't.

---

## F-02-03 — Response Shape

*[SLIDE: TypeScript response object shape]*

The service returns a clean, flat response object.

`items` — the rows for this page. Each is a flat object: `block`, `unit`, `head`, `period`, `amount`, `depositedBy` — all strings and numbers. No nested Prisma model objects.

`totals` — computed across all pages: `rowCount`, `sumAmount`, `distinctUnitsCount`, `distinctPayersCount`.

`page`, `pageSize`, `totalItems`, `totalPages`, `hasNext`, `hasPrev` — pagination metadata.

The UI renders this directly. No recalculation in the component. Business logic stays in the service.

---

## F-03-01 — What the Matrix Shows

*[SLIDE: Example matrix table — units × months × status cells]*

The matrix answers: "For every unit, for every period — has the contribution been paid?"

Rows are units. Columns are periods (12 months for monthly heads, 1 year for yearly heads).

Cells have three states:
- Green / Paid — a contribution detail exists for this unit + period + head
- Amber / Unpaid — no detail, and this period applies to the head
- Grey / N/A — this period doesn't apply (e.g., a yearly head doesn't have monthly cells)

Filters: year and head are required. Block is optional.

[Show app] Here's the matrix with filters applied. I'll change the block and see the row set change.

---

## F-03-02 — MONTH vs YEAR Period Type

*[SLIDE: Side by side — 12-column monthly vs 1-column yearly]*

The head's `periodType` controls the matrix structure.

MONTH heads: 12 columns, one per month. A unit is Paid for a month if a detail exists with `refYear + refMonth` matching.

YEAR heads: 1 column. A unit is Paid for the year if any detail exists with that `refYear`.

In the service, this is handled early:

```ts
const isMonthly = head.periodType === "MONTH";
const months = isMonthly ? [1..12] : [0];
```

Month `0` is the convention for "full year" in the database.

[Show service] Find `isMonthly` in `getPaidUnpaidMatrixReport`. Then find `months` variable and the loop using it.

---

## F-03-03 — In-Memory Aggregation

*[SLIDE: Step-by-step computation flow]*

The matrix is not a SQL pivot. It's an in-memory computation in the service.

The service:
1. Fetches all units (optionally filtered by block)
2. Fetches all paid details for this year + head — builds a lookup map `paidByUnitMonth[unitId][month] = amount`
3. Fetches the active rate for the head
4. Loops every unit × every applicable month
   - If `paidByUnitMonth[unit][month]` exists → Paid
   - Else → Unpaid
5. After computing all rows, applies pagination as an in-memory array slice

This is different from the transactions report where pagination is done in SQL. Here, all rows are computed first, then sliced.

[Show service] Find the `paidByUnitMonth` map construction. Then find the unit loop and the status assignment.

---

## F-03-04 — payUnit and roundTo2

*[SLIDE: payUnit table + roundTo2 formula]*

Expected amount per cell depends on `payUnit`:

1 → per square foot. Quantity = `unit.area`.  
2 → per resident count. Quantity = count of active residents.  
3 → fixed fee. Quantity = 1.

```ts
expectedAmount += roundTo2(quantity * activeRate.rateValue);
```

And `roundTo2`:

```ts
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

Why? `0.1 + 0.2 === 0.30000000000000004` in JavaScript. Floating-point arithmetic is not reliable for money without explicit rounding. `roundTo2` is applied at every multiplication — not just at the final sum — so errors never accumulate.

For `payUnit=2` heads, expected amount is indicative — it uses the current resident count, not the count at payment time.

---

## F-04-01 — Param Parsers

*[SLIDE: parseTransactionsReportParams vs parseMatrixReportParams]*

Each report has a dedicated param parser. This is synchronous validation before any database work starts.

Key patterns:
- Numbers are parsed with `parseInt` and range-checked — not trusted as-is
- Dates are parsed with `new Date()` and checked for `isNaN`
- Sort fields are validated against an explicit allowlist — prevents injection into `orderBy`
- `pageSize` is capped at 100 for the normal JSON API

If validation fails, the parser throws `new HttpError(400, "VALIDATION_ERROR", message)`. The route handler's `try/catch` converts this to a `400` response. No DB query runs.

[Show service] Read `parseTransactionsReportParams`. Point out the sort allowlist check and date validation.

---

## F-04-02 — db.$transaction Consistency

*[SLIDE: Parallel read diagram]*

Prisma's `db.$transaction([...])` runs all queries in the array simultaneously, in the same database snapshot.

For the transactions report: 5 queries in parallel. Total latency = slowest query (not sum of all).

The consistency guarantee: if a payment is committed between when the first query runs and the last, the transaction ensures all five either see it or none do. No partial results.

This is read-only — no writes. We use the parallel form `db.$transaction([...])` (array), not the callback form `db.$transaction(async tx => ...)` (sequential callback). The callback form is for writes that depend on each other's results.

---