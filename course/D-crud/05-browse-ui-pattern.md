# D-05 — The Browse UI Pattern

---

## Slide 1 of 3 — `useBrowseState`: Draft vs Applied

**Headline:** Filtering has two states: what the user is typing, and what the last search used.

**Talking points:**
- A naive filter implementation re-fetches on every keystroke. Type "Blo" → fetch. Type "c" → fetch. Type "k" → fetch. Three network requests for one intended search. More importantly, if the user changes the filter and then decides not to apply it, the table has already updated.
- `useBrowseState` solves this with a **draft / applied split**. There are two parallel state objects:
  - `filters` — what the user has typed in the form (draft). Changes immediately on every input event.
  - `appliedFilters` — the filters from the last successful fetch. Only changes when the user explicitly clicks Apply (or resets).
- The data-loading `useEffect` depends on `appliedFilters`, `appliedSortBy`, `appliedSortDir`, and `page`. Changing a draft filter does not trigger a fetch. Only `applyFilters()` promotes draft → applied and triggers the reload.

```typescript
// Configuration shape — what you pass to useBrowseState
const config: BrowseConfig<BlockItem, SortOption> = {
  endpoint:      "/api/blocks",
  errorMessage:  "Could not load blocks.",
  pageSize:      20,
  sortOptions:   [{ value: "description", label: "Sort by description" }, ...],
  defaultSortBy: "description",
  filters: [
    { key: "q", defaultValue: "" },
  ],
};

const state = useBrowseState<BlockItem, SortOption>(config);
```

- The `buildParams` option allows custom extra parameters. For example, the Units page passes `blockId` from the context to the API — the `buildParams` function builds `{ blockId: state.appliedFilters.blockId }` to append to every fetch.
- URL sync: `useBrowseState` reads the initial state from `useSearchParams()` and calls `pushQueryState` when filters are applied. This means the current search is always reflected in the URL. A user can bookmark `?q=Block+A&sortBy=description` and return to the same filtered view.

**Visual:** Three-column state diagram: "User types" (draft filters update) → "User clicks Apply" (appliedFilters ← draft, fetch triggered) → "Data loads" (items, totalItems update). Show `pushQueryState` firing at the Apply step, writing to the URL bar.

**Takeaway:** Draft state prevents fetch-on-keystroke. Applied state is the source of truth for data loading. The URL is always in sync with applied state.

---

## Slide 2 of 3 — Wiring the UI: `DataTable`, `PaginationControls`, `NoticeStack`

**Headline:** Three components compose every browse page. Each one consumes a slice of `BrowseState`.

**Talking points:**
- Open `app/(dashboard)/blocks/page.tsx`. Walk through the JSX structure:

```tsx
// 1. BrowseFilterBar — search input, sort selector, Apply + Reset buttons
<BrowseFilterBar
  query={state.query}
  onQueryChange={(v) => state.setFilter("q", v)}
  sortBy={state.sortBy}
  onSortByChange={state.setSortBy}
  sortDir={state.sortDir}
  onSortDirChange={state.setSortDir}
  onApply={state.applyFilters}
  onReset={state.resetFilters}
  sortOptions={SORT_OPTIONS}
/>

// 2. DataTable — paginated table of rows
<DataTable
  rowKey="id"              // ← required: unique key per row
  columns={COLUMNS}
  rows={state.items}
  loading={state.loading}
  loadError={state.loadError}
/>

// 3. PaginationControls — prev/next page buttons
<PaginationControls
  page={state.page}
  totalPages={state.totalPages}
  totalItems={state.totalItems}
  onPageChange={state.setPage}
/>

// 4. NoticeStack — success and error flash messages
<NoticeStack
  submitError={state.submitError}
  submitSuccess={state.submitSuccess}
/>
```

- **`rowKey="id"`**: `DataTable` uses this prop to generate the React `key` for each row. Without a stable key, React cannot efficiently diff the list on re-render — it re-mounts every row. Always use the entity's primary key.
- **`loading` and `loadError`**: The table handles its own loading skeleton and error state. The page component does not need to conditionally render the table — it always renders and delegates these states.
- **`NoticeStack`**: Shows `submitError` (red) and `submitSuccess` (green) banners. These come from `useCrudActions` — when a create or update completes, `setSubmitSuccess` or `setSubmitError` is called, and `NoticeStack` renders the message. They auto-dismiss after a timeout.

**Visual:** Annotated screenshot (or mockup) of the blocks browse page. Label each component: BrowseFilterBar at the top, DataTable in the middle, PaginationControls at the bottom, NoticeStack as a floating overlay.

**Takeaway:** Every browse page in this project is the same four-component composition. Learning one browse page means understanding all of them.

---

## Slide 3 of 3 — `useCrudActions` and Inline Edit/Delete

**Headline:** Mutations integrate with the same state that drives the list.

**Talking points:**
- Open `use-crud-actions.ts`. The hook is initialized with callbacks from `useBrowseState`:

```typescript
const actions = useCrudActions({
  setSubmitError:   state.setSubmitError,
  setSubmitSuccess: state.setSubmitSuccess,
});
```

- This wiring means that when `actions.create()` succeeds, it calls `state.setSubmitSuccess(...)` — the `NoticeStack` shows the green banner automatically.
- The `onSuccess` callback for create:

```typescript
actions.create<BlockItem>({
  endpoint:     "/api/blocks",
  body:         { description: newDescription },
  errorMessage: "Could not create block.",
  onSuccess: (newBlock) => {
    state.setItems((prev) => [newBlock, ...prev]);
    state.setTotalItems((prev) => prev + 1);
    state.setSubmitSuccess("Block created.");
    setNewDescription("");
  },
});
```

- `state.setItems((prev) => [newBlock, ...prev])` — prepends the new row to the existing list. No network refetch. The `totalItems` count is incremented in place. The UI updates immediately.
- For delete, the pattern is:

```typescript
actions.delete({
  endpoint:     `/api/blocks/${id}`,
  errorMessage: "Could not delete block.",
  onSuccess: () => {
    state.setItems((prev) => prev.filter((b) => b.id !== id));
    state.setTotalItems((prev) => prev - 1);
    state.setSubmitSuccess("Block deleted.");
  },
});
```

- These optimistic-style updates keep the UI snappy without re-fetching the entire page. If the network request fails, `setSubmitError` is called instead of `onSuccess` — the list is not modified.
- `deleteLoadingId` from `useCrudActions` tracks which row's delete button is currently spinning — so only the targeted row shows a loading indicator, not the entire table.

**Visual:** Before/after table diagram: "Block A, Block B, Block C" → delete Block B → `setItems(filter)` → "Block A, Block C". Annotate `deleteLoadingId` highlighting only the Block B row during the request.

**Takeaway:** `useCrudActions` and `useBrowseState` share state via callbacks. Successful mutations update the local list without a refetch. Failed mutations show an error notice without touching the list.

**Transition to D-06:** "You now have every building block. In the exercise we'll put them together and build a complete module from schema to list page."
