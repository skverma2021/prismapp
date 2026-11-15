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

The app has two reports. They solve different problems.

The **Paid/Unpaid Matrix** is for management. The question is: "I need to see which flats owe money this month."

It is a coverage grid, unit by period. Each cell is colored green or amber.

The **Transactions Report** is for audit. The question is: "Show me exactly what was recorded, by whom, and when."

It is a flat list of individual payment detail rows.

Both reports require login. Any of the three roles can see them. Those roles are Admin, Manager, and Read-Only.

[Switch to app] Here are both report cards on the dashboard. I will click into the Matrix first. You can see the grid.

Then I will open the Transactions report. It is a table of records.

---

## F-01-02 — Architecture: Three Layers

*[SLIDE: Architecture flow diagram]*

Every report follows the same three-layer flow that you saw in the CRUD modules.

The **page** is a Client Component. It holds filter state, fetches the API, and renders the table. It has no server state and no SSR. It uses only browser fetch.

The **route handler** is 10 to 15 lines. It authenticates, parses params, calls the service, and returns the response.

The **service** is where all the logic lives. It is one big file, `contributions-reports.service.ts`.

Suppose you need to change what a report filters. You change the service. The route handler stays the same.

[Show in VS Code] Here is the matrix route handler. It has 15 lines. Here is the service. It is much longer.

That split is intentional.

---

## F-01-03 — ContributionDetail Grain

*[SLIDE: ERD fragment — Contribution → ContributionDetail]*

Before you can understand either report, you need to understand the grain.

A single payment creates these rows:
- One `Contribution`, the transaction header
- One or more `ContributionDetail` rows, one per period covered

Suppose someone pays three months at once. Then there is one contribution and three detail rows.

Reports are built from `ContributionDetail`, not `Contribution`. The reason is that detail is the per-period level.

The matrix asks "is month X paid?" That is a detail-level question.

[Show in service] Look at line 1 of `getContributionTransactionsReport`. It is `db.contributionDetail.findMany`. It is not `db.contribution`.

The query is detail-level from the start.

---

## F-02-01 — Transactions Filters

*[SLIDE: Nine filters table]*

The transactions report accepts nine parameters. Only year is required.

The required one is `refYear`. It selects which year of periods to show.

The optional ones are month, head, unit, block, depositor, date range start, date range end, and sort.

All parsing and validation happens in `parseTransactionsReportParams`. This runs before any database query. Invalid params throw a `400`. The database never sees them.

[Show in service] Here is the parse function. See the `parseInt` calls. See the allowlist check for `sortBy`. See the date range validation.

All of it is synchronous. There is no DB call.

---

## F-02-02 — Five Parallel Queries

*[SLIDE: db.$transaction array with 5 items]*

Inside the service function, five queries run together using `db.$transaction([...])`.

Each query serves one purpose:

1. Paginated detail rows. This is what the table shows.
2. Total count. This is how many rows match, for pagination.
3. Aggregate sum. This is the total amount across ALL pages.
4. Distinct unit IDs. This counts how many distinct units.
5. Distinct depositor IDs. This counts how many distinct payers.

This point is critical. Queries 3, 4, and 5 do NOT have `skip` or `take`. They always cover the full dataset, whichever page you are on.

That is how totals stay accurate across pagination.

[Show code] Here is the array. Items has `skip` and `take`. The aggregate and distinct queries do not.

---

## F-02-03 — Response Shape

*[SLIDE: TypeScript response object shape]*

The service returns a clean, flat response object.

`items` holds the rows for this page. Each row is a flat object. It has `block`, `unit`, `head`, `period`, `amount`, and `depositedBy`. All values are strings and numbers. There are no nested Prisma model objects.

`totals` is computed across all pages. It has `rowCount`, `sumAmount`, `distinctUnitsCount`, and `distinctPayersCount`.

Then come `page`, `pageSize`, `totalItems`, `totalPages`, `hasNext`, and `hasPrev`. These are the pagination metadata.

The UI renders this directly. The component does no recalculation. Business logic stays in the service.

---

## F-03-01 — What the Matrix Shows

*[SLIDE: Example matrix table — units × months × status cells]*

The matrix answers one question: "For every unit, for every period, has the contribution been paid?"

Rows are units. Columns are periods. A monthly head has 12 columns. A yearly head has 1 column.

Cells have three states:
- Green or Paid. A contribution detail exists for this unit, period, and head.
- Amber or Unpaid. There is no detail, and this period applies to the head.
- Grey or N/A. This period does not apply. For example, a yearly head has no monthly cells.

Year and head are required filters. Block is optional.

[Show app] Here is the matrix with filters applied. I will change the block. Watch the row set change.

---

## F-03-02 — MONTH vs YEAR Period Type

*[SLIDE: Side by side — 12-column monthly vs 1-column yearly]*

The `periodType` of the head controls the matrix structure.

MONTH heads have 12 columns, one per month. A unit is Paid for a month if a detail exists with matching `refYear + refMonth`.

YEAR heads have 1 column. A unit is Paid for the year if any detail exists with that `refYear`.

In the service, this is handled early:

```ts
const isMonthly = head.periodType === "MONTH";
const months = isMonthly ? [1..12] : [0];
```

Month `0` is the convention for "full year" in the database.

[Show service] Find `isMonthly` in `getPaidUnpaidMatrixReport`. Then find the `months` variable and the loop that uses it.

---

## F-03-03 — In-Memory Aggregation

*[SLIDE: Step-by-step computation flow]*

The matrix is not a SQL pivot. It is an in-memory computation in the service.

The service does these steps:
1. It fetches all units, optionally filtered by block.
2. It fetches all paid details for this year and head. It builds a lookup map, `paidByUnitMonth[unitId][month] = amount`.
3. It fetches the active rate for the head.
4. It loops over every unit and every applicable month.
   - If `paidByUnitMonth[unit][month]` exists, the cell is Paid.
   - Otherwise, the cell is Unpaid.
5. After computing all rows, it applies pagination as an in-memory array slice.

This is different from the transactions report. There, pagination is done in SQL. Here, all rows are computed first and then sliced.

[Show service] Find the `paidByUnitMonth` map construction. Then find the unit loop and the status assignment.

---

## F-03-04 — payUnit and roundTo2

*[SLIDE: payUnit table + roundTo2 formula]*

The expected amount per cell depends on `payUnit`.

1 means per square foot. Quantity is `unit.area`.  
2 means per resident count. Quantity is the count of active residents.  
3 means fixed fee. Quantity is 1.

```ts
expectedAmount += roundTo2(quantity * activeRate.rateValue);
```

And `roundTo2`:

```ts
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

Why do we need it? In JavaScript, `0.1 + 0.2 === 0.30000000000000004`.

Floating-point arithmetic is not reliable for money without explicit rounding.

`roundTo2` is applied at every multiplication, not just at the final sum. So errors never accumulate.

For `payUnit=2` heads, the expected amount is only indicative. It uses the current resident count, not the count at payment time.

---

## F-04-01 — Param Parsers

*[SLIDE: parseTransactionsReportParams vs parseMatrixReportParams]*

Each report has a dedicated param parser. This is synchronous validation before any database work starts.

These are the key patterns:
- Numbers are parsed with `parseInt` and range-checked. They are not trusted as they are.
- Dates are parsed with `new Date()` and checked for `isNaN`.
- Sort fields are validated against an explicit allowlist. This prevents injection into `orderBy`.
- `pageSize` is capped at 100 for the normal JSON API.

If validation fails, the parser throws `new HttpError(400, "VALIDATION_ERROR", message)`.

The `try/catch` in the route handler converts this to a `400` response. No DB query runs.

[Show service] Read `parseTransactionsReportParams`. Point out the sort allowlist check and the date validation.

---

## F-04-02 — db.$transaction Consistency

*[SLIDE: Parallel read diagram]*

Prisma `db.$transaction([...])` sends all queries in the array together. They read from the same database snapshot.

For the transactions report, 5 queries run in parallel. Total latency is the slowest query, not the sum of all.

Here is the consistency guarantee. Suppose a payment is committed between the first query and the last. The transaction ensures that all five queries either see it or none do. There are no partial results.

This is read-only. There are no writes.

We use the array form, `db.$transaction([...])`. We do not use the callback form, `db.$transaction(async tx => ...)`.

The callback form is for writes that depend on each other's results.

---