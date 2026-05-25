# Slide Script — F-04: Service Layer

---

## Slide 1 — Param Parsing: Validation Before the Database

**Type:** `Code`

**Headline:**
> Each report has a dedicated parse function that validates and coerces URL params before touching the database.

**Visual / layout:**
Side-by-side: `parseTransactionsReportParams` vs `parseMatrixReportParams`. Arrows showing which params each accepts. A callout: "Throws 400 HttpError — never reaches query".

**Narration:**
Both service functions are preceded by a param-parser that takes raw `URLSearchParams` (strings from the URL) and returns a typed params object.

`parseTransactionsReportParams` is larger — it handles nine parameters including date range and sort controls.

`parseMatrixReportParams` is smaller — only `refYear`, `headId`, `blockId`, and pagination.

Both follow the same pattern:

```ts
export function parseTransactionsReportParams(
  searchParams: URLSearchParams
): TransactionsReportParams {
  const refYear = parseInt(searchParams.get("refYear") ?? "", 10);
  if (!refYear || refYear < 2000 || refYear > 2100) {
    throw new HttpError(400, "VALIDATION_ERROR", "refYear is required and must be a valid year");
  }
  // ... parse each optional param
  // ... validate sortBy against an allowlist
  // ... validate date range ordering
  return { refYear, refMonth, headId, unitId, ... };
}
```

Key validation decisions:
- Numbers are parsed with `parseInt` and validated for range — not trusted raw.
- Dates are parsed with `new Date(...)` — then checked for `isNaN`.
- Sort fields are validated against an explicit allowlist (`["transactionDateTime", "createdAt", "amount", "id"]`). Any other value returns a `400` — this prevents injection into the `orderBy` clause.
- `pageSize` is capped at 100. Clients cannot request unlimited pages through the normal API.

The route handler is then reduced to:

```ts
export async function GET(req: NextRequest) {
  const auth = await requireReadRole(req);
  const params = parseTransactionsReportParams(
    new URL(req.url).searchParams
  );
  const data = await getContributionTransactionsReport(params);
  return ok(data);
}
```

**On-screen action / demo:**
Open `contributions-reports.service.ts`. Read `parseTransactionsReportParams`. Show the sort allowlist validation. Then open the route handler file — show how thin it is.

**Key takeaway:**
Param parsing is synchronous validation. Bad input stops at the parser — the database never sees invalid data.

---

## Slide 2 — `db.$transaction` for Consistent Parallel Reads

**Type:** `Concept`

**Headline:**
> Multiple read queries wrapped in `db.$transaction([...])` run consistently and in parallel.

**Visual / layout:**
Diagram: Prisma `$transaction` array → Database (5 arrows going to 5 tables in parallel) → Results returned together. Timeline showing: sequential (5 × latency) vs parallel (1 × max latency).

**Narration:**
Prisma supports two forms of `$transaction`:

1. **Sequential** — `await db.$transaction(async (tx) => { ... })` — runs operations one after another in the same transaction.
2. **Parallel** — `await db.$transaction([...])` — runs all operations in parallel and waits for all to complete.

The transactions report uses the **parallel** form because the five queries are independent — they don't need each other's results to proceed. Prisma submits all five to the database simultaneously, which typically reduces total latency to the slowest single query rather than the sum of all five.

The consistency guarantee: all five queries see the same database snapshot. If a payment is recorded between when the first query starts and the last query ends, the transaction ensures either all five see it or none do.

```ts
const [items, totalItems, totalAmountAggregate, unitRows, payerRows] =
  await db.$transaction([
    db.contributionDetail.findMany({ where, include: {...}, skip, take }),
    db.contributionDetail.count({ where }),
    db.contributionDetail.aggregate({ where, _sum: { amt: true } }),
    db.contribution.findMany({ where: {...}, select: { unitId: true }, distinct: ["unitId"] }),
    db.contribution.findMany({ where: {...}, select: { depositedBy: true }, distinct: ["depositedBy"] }),
  ]);
```

Note that `unitRows` and `payerRows` use a different `where` clause from `items` and `totalItems`. The unit/payer distinct counts apply the contribution-level filters but not the pagination, to get correct full-dataset distinct counts.

**On-screen action / demo:**
Open the service. Show the `db.$transaction([...])` block. Expand one of the `where` clauses to show filter application. Point out the difference between the `items` query (has `skip`/`take`) and the total queries (no `skip`/`take`).

**Key takeaway:**
`db.$transaction([...])` = parallel read queries with consistent snapshot. Pagination only on the items query; totals always query the full dataset.

---

## Slide 3 — `roundTo2` and Why Money Needs Explicit Rounding

**Type:** `Concept`

**Headline:**
> Floating-point arithmetic is unreliable for money. `roundTo2` prevents silent drift.

**Visual / layout:**
JavaScript console screenshot (or code block) showing: `0.1 + 0.2 === 0.30000000000000004`. Then `roundTo2(0.1 + 0.2) === 0.3`. Below: the function definition.

**Narration:**
This is a classic JavaScript pitfall. Decimal fractions like 0.1 cannot be represented exactly in binary floating-point. Accumulate enough of them and rounding errors compound into visible discrepancies.

For contribution amounts, this matters because:
- `amount = quantity × rateValue`
- `expectedAmount = Σ (quantity × rateValue) per unit per period`

If `rateValue = 2.50` and a unit has 1400 sqft, the amount is `3500.00`. That's exact. But if `rateValue = 1.75`, the amount is `2450.00` — also exact. But if rateValue involved a fractional rate that doesn't convert cleanly to binary, accumulated sums would drift.

PrismApp takes the safe path:

```ts
function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}
```

Every multiplication is immediately rounded to 2 decimal places before being accumulated. This ensures totals are deterministic regardless of the number of units or the rate value.

The same function is used in the contributions write path (when recording a payment) and in the reports read path (when computing expected amounts). Consistent rounding = consistent numbers between payment time and report time.

**On-screen action / demo:**
Open the service. Show `roundTo2` at the top. Then show where it is called inside the matrix loop: `roundTo2(quantity * activeRate.rateValue)`.

**Key takeaway:**
`roundTo2` is used at every multiplication. It prevents the floating-point drift that would make financial totals unreliable.
