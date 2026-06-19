# Walkthrough — Reports (Aggregation and Read-Only Pages)

The Reports module is architecturally different from every CRUD module in the project. There are no mutations. There is no inline edit form. The page is driven entirely by URL query parameters. The service builds aggregated, derived views across multiple tables rather than fetching rows directly.

Study this after Contributions — the reports draw all of their data from the contribution tables you learned there.

---

## Why a Separate Walkthrough?

A common mistake when building reporting pages is to apply the CRUD pattern: fetch rows, render a table, add forms for filters. The CRUD hooks (`useBrowseState`, `useCrudActions`) and the service patterns (create/update/delete) do not apply here.

Reports need:
- URL-driven filter state (so the page is bookmarkable and shareable)
- Multiple required filters that must be validated before a query runs
- Aggregation queries that are never a simple `findMany`
- A CSV export of the current result set
- Pagination that remains coherent with multi-column totals

Each of these requires deliberate design decisions that are worth understanding.

---

## Two Report Types

### 1 — Paid/Unpaid Matrix

`GET /api/reports/contributions/matrix?refYear=2026&headId=1`

**What it shows:** One row per unit. Twelve monthly status columns. Each cell is `Paid`, `Unpaid`, or `N/A` (for yearly heads, only the annual column is meaningful).

**What it answers:** *"For head X in year Y, which units have paid which months?"*

```ts
type MatrixRow = {
  unitId: string;
  unitDescription: string;
  blockId: string;
  blockDescription: string;
  ownerName: string | null;
  residentName: string | null;
  jan: "Paid" | "Unpaid" | "N/A";
  feb: "Paid" | "Unpaid" | "N/A";
  // ... mar through dec
  annualStatus: "Paid" | "Unpaid" | "N/A";
  paidMonthsCount: number;
  unpaidMonthsCount: number;
};
```

### 2 — Transactions List

`GET /api/reports/contributions/transactions?refYear=2026`

**What it shows:** A paginated list of every contribution entry, with filters for month, head, unit, block, deposited-by, and transaction date range.

**What it answers:** *"Show me all payments made in March by unit A-101 for head Maintenance."*

---

## How the Matrix Is Built

The matrix does not have a `MatrixReport` table. It is assembled in memory from the contribution data.

The service (`contributions-reports.service.ts`) runs this query:

```ts
// Fetch all paid ContributionDetail rows for the year and head
const paidDetails = await db.contributionDetail.findMany({
  where: {
    contribution: {
      contributionHeadId: headId,
      // corrections with negative amounts are included — they net against positive entries
    },
    contributionPeriod: {
      refYear,
    },
  },
  select: {
    contributionPeriodId: true,
    amt: true,
    contribution: {
      select: { unitId: true }
    },
    contributionPeriod: {
      select: { refMonth: true }
    },
  },
});
```

Then, for each unit:
1. Sum `amt` per `refMonth` — if the total is positive, the month is `Paid`; if zero, it is `Unpaid`
2. Apply `N/A` for months that are not applicable (yearly head → all monthly columns are `N/A`)

This approach handles corrections automatically: a positive entry (`+450`) followed by a correction (`-450`) nets to zero, which is `Unpaid` — the correct outcome.

---

## Required vs Optional Filters

The matrix requires `refYear` and `headId`. Without them, the query is too broad to be useful and too expensive to run:

```ts
export function parseMatrixReportParams(searchParams: URLSearchParams): MatrixReportParams {
  const refYear = parseRequiredPositiveInt(searchParams.get("refYear"), "refYear");
  const headId  = parseRequiredPositiveInt(searchParams.get("headId"),  "headId");
  // ...
}
```

The transactions report requires only `refYear`. All other filters are optional — they narrow the result set progressively.

The service validates the filter constraints before touching the database. If a caller provides `transactionDateFrom > transactionDateTo`, they get `400 VALIDATION_ERROR` rather than an empty result set. Empty results and invalid inputs are different conditions; only one of them should return `200 OK`.

---

## URL-Driven Filter State

The report page holds no filter values in local state. All filter values live in the URL:

```
/reports/contributions/transactions?refYear=2026&refMonth=3&headId=1&blockId=block-uuid
```

The page reads `useSearchParams()` and updates the URL via `pushQueryState()` (the same helper used by `useBrowseState` in CRUD modules). This means:

- Refreshing the page preserves the exact filter state
- Back navigation restores the previous filter set
- Copying and pasting the URL shares the exact view with another user
- The "Export CSV" button uses the same URL parameters — the export always matches what is on screen

This is a higher standard than "filters are in local state and the URL always shows the same page". For reporting pages used by managers and auditors, reproducibility matters.

---

## CSV Export

`GET /api/reports/contributions/transactions/csv?refYear=2026&...`

The CSV endpoint accepts the same filter parameters as the paginated endpoint but returns all matching rows (no pagination), formatted as a CSV file.

The response uses:
```ts
return new Response(csvContent, {
  headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="transactions-${refYear}.csv"`,
  },
});
```

The CSV header row includes a comment line with the applied filters and generation timestamp:

```
# Generated: 2026-05-31T09:00:00Z
# Filters: refYear=2026 refMonth=3 headId=1
# ...column headers...
ID,Unit,Block,...
```

This is the "filter echo" requirement from `vault/04-Reports/Contribution-Reports.md`. When an auditor opens a CSV three months later, they can see exactly what filters produced it.

The `MAX_PAGE_SIZE` guard does not apply to CSV exports — they fetch all matching rows. This is intentional: an export is a deliberate act, not an accidental over-fetch. But the filter validation still runs, preventing pathologically broad exports.

---

## Totals

The transactions report returns a `summary` object alongside the paginated rows:

```json
{
  "items": [...],
  "summary": {
    "totalAmount": 47250.00,
    "transactionCount": 105,
    "paidUnitCount": 42
  },
  "page": 1,
  "totalItems": 105,
  ...
}
```

Totals reflect the **filtered result set**, not all records. If you filter to Block A, the totals show Block A's numbers only.

The totals are computed in a second query using `_sum` and `_count` aggregations, not by summing the page's items:

```ts
const [items, summary] = await db.$transaction([
  db.contributionDetail.findMany({ where, skip, take, ... }),
  db.contributionDetail.aggregate({
    where,
    _sum: { amt: true },
    _count: { id: true },
  }),
]);
```

Two reasons for this:
1. The page items are a slice of the full result set; summing them would give partial totals
2. Both queries run in the same transaction, so the totals are consistent with the items

---

## The Report Pages (UI)

The report pages live outside `(dashboard)/` in their own route group:

```
app/reports/
  layout.tsx
  contributions/
    transactions/page.tsx
```

These pages are `"use client"` components but use a simpler hook setup than CRUD pages — no `useCrudActions`, no inline edit forms. The pattern is:

```ts
const searchParams = useSearchParams();
const refYear = searchParams.get("refYear");

// Fetch when search params change
useEffect(() => {
  if (!refYear) return;
  fetchReport(searchParams.toString()).then(setData);
}, [searchParams.toString()]);
```

Filter changes call `pushQueryState({ refYear: newYear, ... })`, which updates the URL. The `useEffect` dependency on `searchParams.toString()` triggers a re-fetch automatically.

---

## Indexes Matter Here

Report queries aggregate across potentially thousands of rows. The following indexes exist in `prisma/schema.prisma` specifically to support these queries:

```prisma
model ContributionDetail {
  @@index([contributionPeriodId])
  @@index([contributionEntryId])
}

model ContributionEntry {
  @@index([unitId])
  @@index([contributionHeadId])
  @@index([transactionDateTime])
}
```

Without these indexes, the matrix query would perform a sequential scan of all contribution rows for every report load. With them, PostgreSQL can filter to the relevant period/head rows using index seeks.

When you add a new filter option to a report, check whether an index supports it before deploying.

---

## Things Worth Noticing

**No `useCrudActions` on report pages.** If you find yourself importing `useCrudActions` on a reporting page, you are in the wrong pattern.

**Corrections net automatically.** The matrix uses `SUM(amt)` — positive entries add, correction reversal entries subtract. No special handling is needed for corrections in the report query. This is why immutable append-only financial records pay off: the report logic stays simple.

**Required filters protect the database.** The matrix requires `refYear` and `headId`. Without this, a single request could trigger a full table scan across all contribution data. Required filters are not a UX decision — they are a performance boundary.

**CSV and paginated endpoints share parameter parsing.** `parseTransactionsReportParams` is called by both the paginated and CSV handlers. Shared parsing means the CSV always respects the same validation rules as the paginated response.

---

## What to Read Next

- **`vault/04-Reports/Contribution-Reports.md`** — the spec that defines exactly what columns, filters, and totals each report must have.
- **`src/modules/reports/contributions-reports.service.ts`** — the full service. Focus on `buildMatrixReport` to see how the pivot table is assembled.
- **`src/lib/url-query-state.ts`** — the `pushQueryState` helper used by all URL-driven filter UIs.
- **`app/reports/contributions/`** — the report page components. Compare the structure to a CRUD page (`app/(dashboard)/units/page.tsx`) to see what is different.
