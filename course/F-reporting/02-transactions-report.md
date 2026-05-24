# Slide Script — F-02: Transactions Report

---

## Slide 1 — Filters and What They Do

**Type:** `Concept`

**Headline:**
> Nine filters. One is required. The rest narrow the result set independently.

**Visual / layout:**
Two-column table: filter name, what it filters on. Required filters highlighted. Optional filters in normal weight. Below: a note about date range validation.

**Narration:**
The transactions report accepts nine filter parameters. Only `refYear` is required.

| Filter | What it does |
|--------|-------------|
| `refYear` | Required — the year of the contribution period |
| `refMonth` | Narrows to a specific month (0 = yearly head) |
| `headId` | Narrows to one contribution head |
| `unitId` | Narrows to one unit |
| `blockId` | Narrows to all units in a block |
| `depositedBy` | Narrows to contributions by a specific depositor (individual ID) |
| `transactionDateFrom` | Lower bound of transaction date range |
| `transactionDateTo` | Upper bound of transaction date range |
| Sorting | `sortBy` (transactionDateTime / createdAt / amount / id) + `sortDir` (asc/desc) |

All filter parsing happens in `parseTransactionsReportParams`. That function throws a `400 VALIDATION_ERROR` for each of these cases:
- `refYear` missing or not a positive integer
- `refMonth` outside 0–12
- `transactionDateFrom` after `transactionDateTo`
- `sortBy` value not in the allowed list
- `pageSize` exceeding 100

Validation is synchronous — no database roundtrip is needed to validate filter parameters.

**On-screen action / demo:**
Open `contributions-reports.service.ts`. Read `parseTransactionsReportParams` (lines 100–149). Show each validation check.

**Key takeaway:**
Parameters are validated before any query runs. Bad parameters return a `400` immediately — no wasted database round-trip.

---

## Slide 2 — The Five Parallel Queries

**Type:** `Code`

**Headline:**
> `db.$transaction([...])` runs five queries simultaneously in a single database transaction.

**Visual / layout:**
Code block showing the `db.$transaction([...])` call with five named items: `items`, `totalItems`, `totalAmountAggregate`, `unitRows`, `payerRows`. Arrow from each to what it returns.

**Narration:**
Inside `getContributionTransactionsReport`, the function runs five queries simultaneously using `db.$transaction`:

```ts
const [items, totalItems, totalAmountAggregate, unitRows, payerRows] =
  await db.$transaction([...]);
```

Each serves a specific purpose:

| Query | Returns | Purpose |
|-------|---------|---------|
| `contributionDetail.findMany` with skip/take | Paginated detail rows with full includes | The rows displayed in the table |
| `contributionDetail.count` | Integer | Total matching rows — used for pagination |
| `contributionDetail.aggregate({ _sum: { amt: true } })` | Sum | `sumAmount` total across all pages |
| `contribution.findMany` with `distinct: ["unitId"]` | Distinct unit IDs | `distinctUnitsCount` total |
| `contribution.findMany` with `distinct: ["depositedBy"]` | Distinct depositor IDs | `distinctPayersCount` total |

The critical point: `totalAmountAggregate`, `unitRows`, and `payerRows` are computed over **all** matching rows, not just the current page. This is how totals remain accurate across pagination.

If you only counted the items on the current page, the total amount would change as you paginated — which would be wrong.

**On-screen action / demo:**
Open `getContributionTransactionsReport` at line ~200. Read the `db.$transaction` array. Point out that `items` has `skip` and `take` but the other three do not.

**Key takeaway:**
Page-level queries use `skip/take`. Total-level queries do not. Both run in the same transaction for consistency.

---

## Slide 3 — The Response Shape and What the UI Does with It

**Type:** `Concept`

**Headline:**
> The service returns a typed object. The UI never transforms or re-calculates — it only renders.

**Visual / layout:**
TypeScript type definition of the response shape. Callout boxes pointing to: `items[]` (paginated rows), `totals` (full-dataset aggregates), `totalItems` / `totalPages` / `hasNext` / `hasPrev` (pagination metadata).

**Narration:**
The service function returns a structured object:

```ts
{
  items: MappedDetail[],    // rows for the current page
  page: number,
  pageSize: number,
  totalItems: number,       // total rows across all pages
  totalPages: number,
  hasNext: boolean,
  hasPrev: boolean,
  totals: {
    rowCount: number,           // same as totalItems
    sumAmount: number,          // sum across ALL pages
    distinctUnitsCount: number, // distinct units across ALL pages
    distinctPayersCount: number // distinct payers across ALL pages
  }
}
```

The UI page receives this and renders it directly. It does not recalculate totals. It does not re-aggregate. The business logic — what "total amount" means — lives in the service, not the component.

Each row in `items` is a mapped object that flattens the Prisma include chains into a clean flat structure. For example:

```ts
block: detail.contribution.unit.block.description,
unit: detail.contribution.unit.description,
depositedBy: `${detail.contribution.depositor.fName} ${detail.contribution.depositor.sName}`,
```

The UI receives strings, not nested Prisma model objects.

**On-screen action / demo:**
Show the `mappedItems` section in `getContributionTransactionsReport` (around line 310). Then open the transactions UI page and show that it just renders `item.block`, `item.unit`, etc. — no transformation.

**Key takeaway:**
The service flattens and shapes the data. The UI renders it. No business logic in the component.
