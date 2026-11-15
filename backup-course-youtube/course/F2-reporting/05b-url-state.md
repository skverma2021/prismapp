# Slide Script — F-06: URL State and Filter UI

---

## Slide 1 — Why URL State?

**Type:** `Concept`

**Headline:**
> Filters stored in the URL make report pages shareable, bookmarkable, and refresh-safe.

**Visual / layout:**
Browser address bar showing: `.../paid-unpaid-matrix?refYear=2024&headId=3&blockId=1`. Two scenarios side-by-side: "Without URL state" (filter lost on refresh/share) vs "With URL state" (filter preserved).

**Narration:**
Report pages have filters. Users change filters, run the report, then:
- Refresh the page (does it remember the filters?)
- Copy the URL to share with a colleague (do the filters come with it?)
- Use the browser back button (does it restore the previous filter set?)

Without URL state, the answer to all three is "no". React component state (`useState`) is erased on every page load. If you store filters only in `useState`, they vanish on refresh.

With URL state, filters are stored in the query string. The URL encodes the current report configuration. A refresh re-reads the URL. Sharing the URL shares the exact filter set.

In PrismApp, both report pages use a `pushQueryState` utility to write filters to the URL, and `parseMatrixState` / `parseTransactionsState` to read them back on mount.

**On-screen action / demo:**
Open the paid/unpaid matrix page. Set some filters and run the report. Look at the address bar — the URL changed. Copy and open in a new tab — filters are preserved. Refresh — filters are still there.

**Key takeaway:**
URL state = shareable, bookmarkable, refresh-safe reports. `pushQueryState` writes; parse functions on mount read.

---

## Slide 2 — The URL State Pattern: Push and Hydrate

**Type:** `Code`

**Headline:**
> On mount, read from URL. On filter change, write to URL. Never write to URL before the component mounts.

**Visual / layout:**
Code flow diagram: `useSearchParams()` → `parseMatrixState()` → `useState(initialFilters)` → user changes → `pushQueryState()` → URL updates. Arrow from URL back to page reload showing "next mount reads the new URL".

**Narration:**
The paid/unpaid matrix UI page implements this pattern in two steps.

**Hydration on mount** (reading from URL on first render):

```ts
const searchParams = useSearchParams();

useEffect(() => {
  const parsed = parseMatrixState(searchParams);
  setFilters(parsed);
}, []); // run once on mount
```

`parseMatrixState` reads the URL query string and returns a `FiltersState` object with the current values (or defaults if a param is absent).

**Writing to URL on filter change:**

```ts
function updateFilter(key: keyof FiltersState, value: string) {
  const next = { ...filters, [key]: value };
  setFilters(next);
  pushQueryState(next);   // updates the URL without navigation
}
```

`pushQueryState` uses `window.history.pushState` (or `router.push` with `{shallow: true}`) to update the URL without causing a full page navigation. The filter state and the URL stay in sync.

Important: the `useEffect` for hydration runs once, on mount. If you run it on every filter change, you create a loop — state update → URL update → state update → loop.

**On-screen action / demo:**
Open `app/reports/contributions/paid-unpaid-matrix/page.tsx`. Show the `useSearchParams` import. Find the `useEffect` hydration block. Find `pushQueryState` calls.

**Key takeaway:**
Mount = read from URL. Filter change = write to URL. One `useEffect` with empty dep array for hydration; never re-run it.

---

## Slide 3 — `canRun` Guard and Separate Loading States

**Type:** `Concept`

**Headline:**
> Guard conditions prevent running reports with incomplete filters. Multiple loading states prevent overlapping operations.

**Visual / layout:**
Decision tree: `headId !== ""` AND `session.userId !== ""` → enable "Refresh" button. Three spinner booleans: `optionsLoading` / `reportLoading` / `csvLoading`. Table showing when each is true.

**Narration:**
The matrix report requires `refYear` and `headId`. If either is missing, the "Refresh" button is disabled.

```ts
const canRun = filters.headId !== "" && !!session.userId;
```

`session.userId` is checked because the report fetch needs an authenticated session. If the session has expired, `canRun` is false and the user sees a session notice rather than a broken report.

The page also maintains three separate loading booleans:

| Boolean | When true |
|---------|-----------|
| `optionsLoading` | Loading the dropdown data (heads, blocks) on page mount |
| `reportLoading` | Fetching the matrix report after "Refresh" |
| `csvLoading` | Fetching and downloading the CSV |

Why three? Because a CSV export in progress should not prevent the user from re-running the report with different filters. And "options loading" on first render should not block the Refresh button once options are loaded.

A single `isLoading` boolean would be simpler but would cause poor UX: the entire page would be locked whenever any async operation was running.

**On-screen action / demo:**
Open `paid-unpaid-matrix/page.tsx`. Show `canRun`. Show the three `useState` booleans for loading. Show how the "Export CSV" button checks `csvLoading` separately.

**Key takeaway:**
`canRun` guards the Refresh button. Three loading booleans allow concurrent async operations without blocking the UI.
