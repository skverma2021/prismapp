# Section F2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## F-05-01 — CSV Format Contract

*[SLIDE: Example CSV file showing all four sections]*

A PrismApp CSV export has four sections:

1. **Metadata block** — key-value rows: reportTitle, generatedAt, generatedBy, generatedByRole, filter.* (only active filters), rowCount
2. **Blank line** — visual separator
3. **Column headers** — standard CSV header row
4. **Data rows** — one per detail or matrix row

The metadata block makes the file self-describing. Open it months later and you know exactly what filters produced it, who ran it, and when.

[Demo] Export a CSV. Open in text editor. Point out each section.

---

## F-05-02 — CSV Reuses the Service

*[SLIDE: getContributionTransactionsCsv calling getContributionTransactionsReport]*

The CSV export function is not a separate code path. It calls the same service function used by the JSON report:

```ts
const data = await getContributionTransactionsReport({
  ...params,
  page: 1,
  pageSize: Number.MAX_SAFE_INTEGER,
});
```

Three things change: page = 1, pageSize = unlimited, sort = canonical (most recent first).

`Number.MAX_SAFE_INTEGER` bypasses the 100-row page cap. This is intentional — the CSV export is only reachable through the authenticated route handler. External clients can't use this endpoint to dump unlimited rows through the normal paginated API.

[Show service] Find `getContributionTransactionsCsv`. Show the call to `getContributionTransactionsReport`. Show `pageSize: Number.MAX_SAFE_INTEGER`.

---

## F-05-03 — formatCsvValue

*[SLIDE: Escape table — input → output]*

`formatCsvValue` is applied to every value in every CSV row. It handles three cases:

- Commas → wrap in double quotes
- Newlines → wrap in double quotes
- Double quotes inside the value → double them: `"` becomes `""`

Without this, a description like `"Tower A, Wing 1"` would split into two columns. A correction reason that contained a quote would break Excel parsing.

```ts
function formatCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}
```

`null` and `undefined` become empty string — no crash for optional fields.

---

## F-06-01 — URL State Pattern

*[SLIDE: URL with query params + hydrate on mount diagram]*

Report filter state is stored in the URL query string, not just in React state.

Why: React state is erased on every page load. URL state survives refresh, back navigation, and sharing.

Pattern:
1. On mount (`useEffect` with empty dep array): read `useSearchParams()` → parse → `setFilters`
2. On filter change: `setFilters(next)` → `pushQueryState(next)`

`pushQueryState` updates the URL without a full navigation. Filters and URL stay in sync.

[Demo] Set filters, look at URL. Copy URL, open new tab — same filters, same result.

---

## F-06-02 — canRun and Loading States

*[SLIDE: canRun decision tree + three loading booleans]*

The matrix report requires head and year. The Refresh button is disabled until:

```ts
const canRun = filters.headId !== "" && !!session.userId;
```

If the session has expired, `canRun` is false and a session notice appears instead of the report.

Three separate loading booleans:
- `optionsLoading` — dropdown data on page mount
- `reportLoading` — matrix data after Refresh
- `csvLoading` — CSV download in progress

Why separate? A CSV export in progress shouldn't prevent re-running the report. A single `isLoading` would lock the entire page unnecessarily.

---

## F-06-03 — Module Wrap-Up

*[SLIDE: Summary — two reports, one service, same patterns]*

Let's recap Module F.

You've seen:
- Two reports: Transactions (audit trail) and Matrix (coverage view)
- Both built from `ContributionDetail` — the per-period payment grain
- A single service file handling all logic: parsing, queries, CSV generation
- `db.$transaction([...])` for consistent parallel reads where totals are always full-dataset
- In-memory aggregation for the matrix (SQL cannot express a unit × period pivot cleanly)
- `roundTo2` to keep money deterministic
- CSV export reusing the service with unlimited page size
- URL state pattern for shareable, bookmarkable reports

The next module is **G: Testing** — where you'll write unit tests for some of these service functions using Vitest.
