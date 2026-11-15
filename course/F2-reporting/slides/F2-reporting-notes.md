# Section F2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## F-05-01 — CSV Format Contract

*[SLIDE: Example CSV file showing all four sections]*

A PrismApp CSV export has four sections:

1. **Metadata block.** These are key-value rows: reportTitle, generatedAt, generatedBy, generatedByRole, filter.* (only active filters), and rowCount.
2. **Blank line.** This is a visual separator.
3. **Column headers.** This is a standard CSV header row.
4. **Data rows.** There is one per detail or matrix row.

The metadata block makes the file self-describing.

Open the file months later. You will know exactly which filters produced it, who ran it, and when.

[Demo] Export a CSV. Open in text editor. Point out each section.

---

## F-05-02 — CSV Reuses the Service

*[SLIDE: getContributionTransactionsCsv calling getContributionTransactionsReport]*

The CSV export function is not a separate code path. It calls the same service function that the JSON report uses:

```ts
const data = await getContributionTransactionsReport({
  ...params,
  page: 1,
  pageSize: Number.MAX_SAFE_INTEGER,
});
```

Three things change. The page is 1. The pageSize is unlimited. The sort is canonical, most recent first.

`Number.MAX_SAFE_INTEGER` bypasses the 100-row page cap. This is intentional.

The CSV export is only reachable through the authenticated route handler. External clients cannot use this endpoint to dump unlimited rows through the normal paginated API.

[Show service] Find `getContributionTransactionsCsv`. Show the call to `getContributionTransactionsReport`. Show `pageSize: Number.MAX_SAFE_INTEGER`.

---

## F-05-03 — formatCsvValue

*[SLIDE: Escape table — input → output]*

`formatCsvValue` is applied to every value in every CSV row. It handles three cases:

- Commas: wrap the value in double quotes.
- Newlines: wrap the value in double quotes.
- Double quotes inside the value: double them. A `"` becomes `""`.

Without this, a description like `"Tower A, Wing 1"` would split into two columns.

A correction reason that contained a quote would break Excel parsing.

```ts
function formatCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
```

`null` and `undefined` become an empty string. So optional fields cause no crash.

---

## F-06-01 — URL State Pattern

*[SLIDE: URL with query params + hydrate on mount diagram]*

Report filter state is stored in the URL query string, not just in React state.

Why? React state is erased on every page load. URL state survives refresh and back navigation. It can also be shared.

Here is the pattern:
1. On mount, use `useEffect` with an empty dep array. Read `useSearchParams()`, parse it, and call `setFilters`.
2. On filter change, call `setFilters(next)` and then `pushQueryState(next)`.

`pushQueryState` updates the URL without a full navigation. Filters and URL stay in sync.

[Demo] Set filters, look at URL. Copy URL, open new tab — same filters, same result.

---

## F-06-02 — canRun and Loading States

*[SLIDE: canRun decision tree + three loading booleans]*

The matrix report requires head and year. The Refresh button is disabled until this is true:

```ts
const canRun = filters.headId !== "" && !!session.userId;
```

If the session has expired, `canRun` is false. A session notice appears instead of the report.

There are three separate loading booleans:
- `optionsLoading` is for dropdown data on page mount.
- `reportLoading` is for matrix data after Refresh.
- `csvLoading` is for a CSV download in progress.

Why separate? A CSV export in progress should not prevent re-running the report.

A single `isLoading` would lock the entire page without need.

---

## F-06-03 — Module Wrap-Up

*[SLIDE: Summary — two reports, one service, same patterns]*

Let us recap Module F.

You have seen these points:
- Two reports. Transactions is the audit trail. Matrix is the coverage view.
- Both reports are built from `ContributionDetail`, the per-period payment grain.
- A single service file handles all logic. This includes parsing, queries, and CSV generation.
- `db.$transaction([...])` gives consistent parallel reads. The totals always cover the full dataset.
- In-memory aggregation is used for the matrix. SQL cannot express a unit × period pivot cleanly.
- `roundTo2` keeps money deterministic.
- CSV export reuses the service with unlimited page size.
- The URL state pattern makes reports shareable and bookmarkable.

The next module is **G: Testing**. There you will write unit tests for some of these service functions using Vitest.
