# Slide Script — F-03: Paid/Unpaid Matrix

---

## Slide 1 — What Question Does the Matrix Answer?

**Type:** `Concept`

**Headline:**
> The matrix answers: "For every unit, for every period — has the required contribution been paid?"

**Visual / layout:**
Example table. Rows = units (A-101, A-102, B-201 …). Columns = months (Jan–Dec). Cells: "Paid" (green), "Unpaid" (amber), "N/A" (grey). Totals row at the bottom showing collection vs expected amounts.

**Narration:**
The paid/unpaid matrix is the most complex report in PrismApp.

It does not show individual transactions. It shows **coverage**. Has each unit fulfilled its obligation for each period?

Rows are units. Columns are months for monthly contribution heads. For yearly heads, there is a single year column.

Each cell has one of three states:

- **Paid**. At least one contribution detail exists for this unit, this period, and this head.
- **Unpaid**. No contribution detail exists, and the period is in the past or current year.
- **N/A**. The head does not apply to this period. For example, a yearly head does not have 12 month cells.

The report requires two filters: `refYear` and `headId`.

Both are mandatory. The matrix is meaningless without knowing which head to check and which year to display.

**On-screen action / demo:**
Open the app. Navigate to Reports → Paid/Unpaid Matrix. Set refYear to the current year, pick any head, click Refresh. Show the grid with colored cells.

**Key takeaway:**
The matrix is a coverage view. Each cell is computed, not stored. Paid/Unpaid status is derived at report-run time from the `ContributionDetail` table.

---

## Slide 2 — Period Type: MONTH vs YEAR

**Type:** `Concept`

**Headline:**
> The head's `periodType` determines whether the matrix has 12 month columns or 1 year column.

**Visual / layout:**
Side by side. Left: `periodType = MONTH` — table with 12 columns (Jan–Dec). Right: `periodType = YEAR` — table with 1 column (2024). Below: code snippet showing the branch in the service.

**Narration:**
Contribution heads have a `periodType` field. It is either `MONTH` or `YEAR`.

For **MONTH** heads, like monthly maintenance, the matrix shows 12 columns, one per month. A unit is Paid for a month if a `ContributionDetail` exists. It must have `refYear = selected year` and `refMonth = that month`.

For **YEAR** heads, like the annual building fund, the matrix shows one column for the year. A unit is Paid for the year if any `ContributionDetail` exists with `refYear = selected year`.

The service checks this early:

```ts
if (!head) throw new HttpError(404, "NOT_FOUND", "Head not found");
const isMonthly = head.periodType === "MONTH";
```

Then it computes the cell statuses:
```ts
const months = isMonthly ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [0];
```

For YEAR heads, `refMonth` is stored as `0` in the database. This is a convention for "full year."

The UI page uses the constants `MONTH_COLUMN_KEYS` and `MONTH_COLUMN_LABELS`. For YEAR heads, it renders only the year column. It hides the individual month columns.

**On-screen action / demo:**
Open `contributions-reports.service.ts`. Find `getPaidUnpaidMatrixReport`. Show the `isMonthly` branch and the `months` variable.

**Key takeaway:**
Period type drives the matrix structure. Monthly = 12 cells per row. Yearly = 1 cell per row.

---

## Slide 3 — In-Memory Aggregation: How Status is Computed

**Type:** `Code`

**Headline:**
> The matrix is built in memory — not in SQL. Queries fetch facts; the service loops to compute statuses.

**Visual / layout:**
Step-by-step flow diagram:
1. Fetch all units (for blockId filter or all blocks)
2. Fetch paid detail amounts (grouped by unitId + month)
3. (if payUnit=2) Fetch resident counts per unit
4. Fetch active rate for the head
5. Loop all units × all months → compute status
6. Paginate the rows array in-memory

**Narration:**
The paid/unpaid matrix cannot be implemented as a single SQL query. The "all units" requirement does not naturally join with "paid details that may not exist." So the service uses a different approach.

**Step 1.** Fetch every unit that matches the optional `blockId` filter.

**Step 2.** Fetch all `ContributionDetail` records for this year and head. Group them into a lookup map: `paidByUnitMonth[unitId][month] = amount`.

**Step 3.** Fetch the active `ContributionRate` for this head. This is the rate snapshot used for the expected amount calculation.

**Step 4.** Loop over every unit and every applicable month. For each combination:
- If `paidByUnitMonth[unitId][month]` exists, the status is `Paid`.
- Otherwise, the status is `Unpaid`.

**Step 5.** Apply pagination to the in-memory rows array.

This is different from the transactions report. There, pagination is applied in SQL via `skip/take`. Here the code is:
```ts
const paginatedRows = allRows.slice(
  (params.page - 1) * params.pageSize,
  params.page * params.pageSize
);
```

This means totals are always computed across all rows, before pagination.

**On-screen action / demo:**
Open `getPaidUnpaidMatrixReport` in the service. Show the fetch sequence and the inner loop. Point out the `paidByUnitMonth` map construction and the status assignment.

**Key takeaway:**
Matrix = in-memory loop over all units × months. Totals are pre-pagination. Pagination slices the computed rows array.

---

## Slide 4 — `payUnit` and Expected Amount

**Type:** `Concept`

**Headline:**
> Expected amount depends on `payUnit` — the same head can be priced per sqft, per resident, or as a flat fee.

**Visual / layout:**
Three-row table: `payUnit` value, meaning, quantity formula, example. Below: the `roundTo2()` formula with an example calculation.

**Narration:**
Each contribution head has a `payUnit` field. It controls how the expected amount is computed per unit:

| `payUnit` | Meaning | Quantity |
|-----------|---------|---------|
| `1` | Per square foot | `unit.area` (stored on the Unit record) |
| `2` | Per resident count | Count of active residents for this unit |
| `3` | Fixed fee | `1` (flat amount) |

The service fetches unit area from the Unit record. For `payUnit=2`, it runs an additional query to count active residents per unit. For `payUnit=3`, quantity is always 1.

This is the expected amount per cell:
```ts
expectedAmount += roundTo2(quantity * activeRate.rateValue);
```

Where `roundTo2` is:
```ts
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

This is important. Floating-point arithmetic makes naive sums unreliable for money. In JavaScript, `0.1 + 0.2 ≠ 0.3`.

The service rounds to 2 decimal places at every multiplication and sum step. This keeps amounts deterministic.

**Note for `payUnit=2`**: The resident count can change over time. So the expected amount for `payUnit=2` heads is **indicative**.

It reflects the count at report-run time, not at payment time. The vault spec explicitly calls this out.

**On-screen action / demo:**
Open `getPaidUnpaidMatrixReport`. Find the `payUnit` branch. Show the `roundTo2` function.

**Key takeaway:**
`payUnit` controls the quantity formula. All amounts use `roundTo2` to prevent floating-point drift.
