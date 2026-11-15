# Lesson — Shared Components and How They Simplify Every Page

**Audience:** Developers new to component-based frontend architecture, or those coming from traditional templating (Jinja, Razor, Thymeleaf) or jQuery-style page scripting.
**Purpose:** Explain what shared components are, why they exist, and how the five building-block components in this codebase eliminate duplication across all browse pages.
**Placement:** After the App Tour, before studying any individual page.

---

## The Problem: What Happens Without Shared Components

Imagine building the Blocks page from scratch, alone. You write a table, pagination controls, a search box, and a success/error message area. It takes two hours.

Now imagine doing the same for Units. Then Individuals. Then Ownerships. Then Contributions. There are 12+ browse pages in this application. Without sharing anything, you would write essentially the same table, the same pagination, the same filter bar, and the same notice area **twelve times**.

The problems that follow are not just tedious — they are structural:

- A spacing fix to the pagination controls must be made in 12 places.
- A new "loading" state in the table must be added in 12 places.
- One developer styles buttons with `bg-blue-600`, another uses `bg-slate-900`. The app looks inconsistent.
- A bug in the "no items found" message is discovered on the Units page but silently lives on three others.

Shared components solve this by writing something once and using it everywhere.

---

## The Concept: Components as Named Building Blocks

A React component is a function that returns JSX. A **shared component** is one that is general enough to work for multiple pages — it takes its specific behaviour as props.

Think of it like a printed form with blank fields. The form's structure (layout, labels, borders) is fixed. Only the values change per use. A shared component is the form; the page fills in the values.

In this codebase, five shared components handle everything that repeats across browse pages:

```
src/components/master-data/
    data-table.tsx           ← the table
    browse-filter-bar.tsx    ← filters + sort controls
    pagination-controls.tsx  ← previous/next with page count
    notice-stack.tsx         ← error, success, and load-error messages
    context-link-chips.tsx   ← "view related" navigation links

src/components/ui/
    inline-notice.tsx        ← the single notice tile (used by notice-stack)
    state-surface.tsx        ← full-page loading / error states
```

Two hooks drive the interaction between these components and the API:

```
src/hooks/
    use-browse-state.ts      ← fetch, filter, paginate, sort, URL sync
    use-crud-actions.ts      ← create, update, delete with loading states
```

---

## Component 1 — `DataTable<T>`

**File:** `src/components/master-data/data-table.tsx`

### The problem it solves

Without it, every page would write its own `<table>`, manage its own loading row, its own "no items" row, and its own column layout. Every page would have slightly different styling.

### How it works

`DataTable` is a **generic component** — the `<T>` means "I work for any data type you give me." You provide two things: the columns and the items. The component handles the rest.

```typescript
type Column<T> = {
  header: string;                              // column heading text
  render: (item: T, index: number) => ReactNode; // what to show in each cell
  className?: string;                          // optional width/alignment class
};
```

The `render` function is the key idea. You don't pass raw strings — you pass a function that can return anything: plain text, a formatted date, a button, an edit form, a status badge. The column decides what to show; the table decides how to lay it out.

### Usage example — Blocks page

```tsx
// app/(dashboard)/blocks/page.tsx
const columns: Column<BlockItem>[] = [
  {
    header: "Description",
    render: (block, index) =>
      editingId === block.id ? (
        <input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
      ) : (
        block.description
      ),
  },
  {
    header: "Actions",
    className: "w-32",
    render: (block) => (
      <div className="flex gap-1">
        <button onClick={() => setEditingId(block.id)}>Edit</button>
        <button onClick={() => handleDelete(block.id)}>Delete</button>
      </div>
    ),
  },
];

<DataTable
  columns={columns}
  items={browse.items}
  loading={browse.loading}
  rowKey={(block) => block.id}
  emptyMessage="No blocks found. Create one above."
/>
```

**What to notice:**
- The same `DataTable` renders both the Blocks page and the Contributions page — completely different data, completely different columns, identical table chrome (borders, hover state, loading row, empty row).
- `rowKey` is required. React uses it internally to track which rows changed when the list re-renders. Always use the entity's stable ID, never the array index.
- The `render` function for the Description column returns different JSX depending on whether the row is being edited. The table doesn't know about edit mode — the page controls that, and the table just calls `render` and displays whatever it returns.

---

## Component 2 — `BrowseFilterBar` and the Style Constants

**File:** `src/components/master-data/browse-filter-bar.tsx`

### The two jobs this file does

This file does two unrelated things that happen to live together: it defines the **shared style constants** used across every page, and it provides the **filter bar component** that holds the sort controls and the Apply/Reset buttons.

### Part A — Style constants

```typescript
export const INPUT_CLASS    = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm";
export const BTN_PRIMARY    = "rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold ...";
export const BTN_SECONDARY  = "rounded-lg border border-slate-300 bg-white px-3 py-2 ...";
export const BTN_SUBMIT     = "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium ...";
export const BTN_EDIT       = "rounded border border-slate-300 bg-white px-2 py-1 ...";
export const BTN_SAVE       = "rounded border border-emerald-300 bg-emerald-50 px-2 py-1 ...";
export const BTN_CANCEL     = "rounded border border-slate-300 bg-white px-2 py-1 ...";
export const BTN_DELETE     = "rounded border border-rose-300 bg-rose-50 px-2 py-1 ...";
```

These are plain strings exported from one file. Every page imports the constants it needs and applies them as `className`. No page writes its own Tailwind button classes from scratch.

This means: if the design changes — say, buttons switch from `slate-900` to `indigo-700` — you change one string in one file, and every button in the app updates.

### Part B — BrowseFilterBar component

The `BrowseFilterBar` renders the sort-by dropdown, sort-direction dropdown, and the Apply/Reset buttons that are identical on every browse page. The page-specific filters (search box, status dropdown, date range) are passed as `children` and rendered above the sort controls.

```tsx
// Usage on the Units page
<BrowseFilterBar browse={browse} sortOptions={sortOptions}>
  {/* page-specific filter — rendered inside the bar, above the sort controls */}
  <input
    type="text"
    placeholder="Search units..."
    value={browse.filters.q}
    onChange={(e) => browse.setFilter("q", e.target.value)}
    className={INPUT_CLASS}
  />
  <select
    value={browse.filters.blockId}
    onChange={(e) => browse.setFilter("blockId", e.target.value)}
    className={INPUT_CLASS}
  >
    <option value="">All blocks</option>
    {blocks.map((b) => <option key={b.id} value={b.id}>{b.description}</option>)}
  </select>
</BrowseFilterBar>
```

**What to notice:**
- `children` is the `ReactNode` slot. The parent page injects its custom filters here. `BrowseFilterBar` doesn't know what filters each page needs — it just provides the frame and the Apply/Reset buttons.
- `browse.applyFilters()` and `browse.resetFilters()` are wired inside the component. The page doesn't need to wire the button click events — they come free with the component.

---

## Component 3 — `PaginationControls`

**File:** `src/components/master-data/pagination-controls.tsx`

The simplest component. Takes four numbers and a callback:

```typescript
type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};
```

Renders: `Page 2 of 7 · 134 total items` and Previous / Next buttons with disabled state when at the boundary.

```tsx
<PaginationControls
  page={browse.page}
  totalPages={browse.totalPages}
  totalItems={browse.totalItems}
  onPageChange={browse.setPage}
/>
```

`browse.setPage` is the callback. The component knows nothing about how pages are fetched — it just calls the function with the new page number. The hook handles the fetch.

---

## Component 4 — `NoticeStack` and `InlineNotice`

**Files:** `src/components/master-data/notice-stack.tsx`, `src/components/ui/inline-notice.tsx`

### InlineNotice — the base tile

`InlineNotice` renders one coloured message tile. The `tone` prop picks the colour scheme:

| tone | colour | use |
|---|---|---|
| `info` | slate | neutral messages |
| `success` | emerald | "Block created successfully" |
| `warning` | amber | "Rate effective date is after period start" |
| `danger` | rose | "Unable to delete: units exist in this block" |

```tsx
<InlineNotice tone="danger" message="Unable to delete: units exist in this block." />
<InlineNotice tone="success" message="Block created: Block G" />
<InlineNotice tone="warning" message="Rate effective date is newer than the earliest selected period." />
```

### NoticeStack — the compositor

`NoticeStack` wraps `InlineNotice` with the three signals every page needs: `loadError`, `submitError`, `submitSuccess`. If all three are empty strings, it renders nothing. If any are set, it shows the appropriate tile.

```typescript
type NoticeStackProps = {
  submitError?: string;    // e.g. "Unable to create block."
  submitSuccess?: string;  // e.g. "Block created: Block G"
  loadError?: string;      // e.g. "Failed to load blocks."
};
```

```tsx
<NoticeStack
  loadError={browse.loadError}
  submitError={browse.submitError}
  submitSuccess={browse.submitSuccess}
/>
```

These three strings come directly from the hooks. The page never sets them manually — the hooks manage them. The component just displays them.

**What to notice:**
- `NoticeStack` renders `null` when all three props are empty. This is idiomatic React — conditional rendering by returning `null` from a component, not by wrapping with `{condition && <Component>}` in the parent.
- `InlineNotice` is in `src/components/ui/` (not `master-data/`) because it is general-purpose — it is also used in forms, detail pages, and any other place a message tile is needed.

---

## Component 5 — `ContextLinkChips`

**File:** `src/components/master-data/context-link-chips.tsx`

This component renders a row of small navigation links. On the Blocks page, a block row might show "View Units" — a link to the Units page pre-filtered for that block.

```tsx
<ContextLinkChips
  label="Related"
  items={[
    { href: `/units?blockId=${block.id}`, label: "Units" },
  ]}
/>
```

The `items` prop is an array of `{ href, label }` objects. If the array is empty, the component renders nothing.

**What to notice:**
- `"use client"` is at the top of this file even though it uses `Link` (which could work in Server Components). The reason: `ContextLinkChips` is always used inside a Client Component page, and marking it client avoids a server/client boundary error if it is ever passed interactive props.
- The visual style — small caps, rounded pill, teal hover — is defined once here. All cross-entity links in the app look identical.

---

## The Hooks That Drive Everything

The components above are passive — they render what they are given. The two hooks are where the active behaviour lives.

### `useBrowseState` — fetch, paginate, filter, URL sync

**File:** `src/hooks/use-browse-state.ts`

This hook does five jobs that would otherwise be scattered across every page:

1. **Fetches** from the given `endpoint` with the current filters and pagination.
2. **Manages draft vs applied filters** — the filter bar shows draft values (what you're typing); the fetch uses applied values (what you last pressed Apply for). This prevents a fetch on every keystroke.
3. **Syncs to the URL** — `pushQueryState` updates `?page=2&sortBy=description&q=block-a` in the browser URL without a page reload. Filters survive a page refresh.
4. **Manages loading and error state** — `browse.loading`, `browse.loadError` are ready to pass to `DataTable` and `NoticeStack`.
5. **Initialises from the URL** — when the page first loads, it reads the current URL's search params and restores the filter state. Bookmarking a filtered view works.

```typescript
// One call in the page — everything else is handled
const browse = useBrowseState<BlockItem, "description" | "createdAt">({
  endpoint: "/api/blocks",
  errorMessage: "Failed to load blocks.",
  sortOptions: [
    { value: "description", label: "Name" },
    { value: "createdAt", label: "Date Added" },
  ],
  defaultSortBy: "description",
  filters: [{ key: "q" }],
});
```

`browse` is an object with all the state and callbacks the components need. You destructure what you use:

```
browse.items          → pass to DataTable
browse.loading        → pass to DataTable
browse.loadError      → pass to NoticeStack
browse.page           → pass to PaginationControls
browse.totalPages     → pass to PaginationControls
browse.totalItems     → pass to PaginationControls
browse.setPage        → pass to PaginationControls
browse.sortBy         → pass to BrowseFilterBar
browse.setSortBy      → pass to BrowseFilterBar
browse.applyFilters   → called by BrowseFilterBar's Apply button
browse.resetFilters   → called by BrowseFilterBar's Reset button
browse.filters.q      → pass to the search input's value
browse.setFilter      → called by the search input's onChange
```

### `useCrudActions` — create, update, delete

**File:** `src/hooks/use-crud-actions.ts`

This hook wraps the three mutation operations with consistent loading state, error handling, and success messages.

```typescript
const crud = useCrudActions({
  setSubmitError: browse.setSubmitError,
  setSubmitSuccess: browse.setSubmitSuccess,
});
```

The hook is initialised with the two setters from `useBrowseState` so that mutation results flow into the same `NoticeStack` that shows load errors.

```typescript
// Create
crud.create<BlockItem>({
  endpoint: "/api/blocks",
  body: { description: createDescription.trim() },
  errorMessage: "Unable to create block.",
  onSuccess: (data) => {
    setCreateDescription("");
    browse.setItems((prev) => [...prev, data]);
    browse.setTotalItems((prev) => prev + 1);
  },
});

// Update
crud.update<BlockItem>({
  endpoint: `/api/blocks/${block.id}`,
  body: { description: editDescription.trim() },
  errorMessage: "Unable to update block.",
  onSuccess: (data) => {
    browse.setItems((prev) => prev.map((b) => (b.id === data.id ? data : b)));
    setEditingId(null);
  },
});

// Delete
crud.delete({
  endpoint: `/api/blocks/${block.id}`,
  errorMessage: "Unable to delete block.",
  onSuccess: () => {
    browse.setItems((prev) => prev.filter((b) => b.id !== block.id));
    browse.setTotalItems((prev) => prev - 1);
  },
});
```

**What to notice:**
- `onSuccess` updates the local list state directly — `setItems` and `setTotalItems` — rather than triggering a full re-fetch. The list stays responsive: the new row appears or disappears immediately.
- `crud.deleteLoadingId` holds the ID of the row currently being deleted. The delete button checks `crud.deleteLoadingId === block.id` to show a per-row loading spinner. Without this, all delete buttons would be in loading state simultaneously.
- Error and success messages set themselves. If `requireMutationRole` returns 403, the `useCrudActions` error handler catches the `ApiEnvelope` with `ok: false`, extracts the message, and calls `setSubmitError`. The page never writes a try/catch.

---

## How They Compose — a Full Page in Outline

Every browse page in the app has this structure:

```tsx
"use client";

export default function BlocksPage() {
  // 1. Hooks — all state lives here
  const browse  = useBrowseState({ endpoint: "/api/blocks", ... });
  const crud    = useCrudActions({ setSubmitError: browse.setSubmitError,
                                   setSubmitSuccess: browse.setSubmitSuccess });
  const session = useSafeAuthSession();
  const canMutate = session.role !== "READ_ONLY";

  // 2. Define columns — the only page-specific table logic
  const columns = [...];

  return (
    <div>
      {/* Page-specific create form — only shown when canMutate */}
      {canMutate && <CreateForm onCreate={handleCreate} loading={crud.createLoading} />}

      {/* Filter bar — shared, with page-specific children slot */}
      <BrowseFilterBar browse={browse} sortOptions={sortOptions}>
        <input value={browse.filters.q} onChange={...} />
      </BrowseFilterBar>

      {/* Notices — error / success messages from both browse and crud */}
      <NoticeStack
        loadError={browse.loadError}
        submitError={browse.submitError}
        submitSuccess={browse.submitSuccess}
      />

      {/* Table — shared, with page-specific columns */}
      <DataTable columns={columns} items={browse.items} loading={browse.loading} rowKey={...} />

      {/* Pagination — shared, fully wired */}
      <PaginationControls
        page={browse.page}
        totalPages={browse.totalPages}
        totalItems={browse.totalItems}
        onPageChange={browse.setPage}
      />
    </div>
  );
}
```

The page's actual code is **the columns array** and **the event handlers**. Everything else is shared.

---

## What You Don't Write Because of This System

For each new browse page added to this app, you do not write:

| What is not written | Why |
|---|---|
| The `<table>`, `<thead>`, `<tbody>` structure | `DataTable` provides it |
| The loading row and empty row | `DataTable` provides them |
| The sort-by and sort-direction dropdowns | `BrowseFilterBar` provides them |
| The Apply and Reset buttons | `BrowseFilterBar` provides them |
| The Previous/Next buttons | `PaginationControls` provides them |
| "Page X of Y · N total items" text | `PaginationControls` provides it |
| The success/error message tiles | `NoticeStack` + `InlineNotice` provide them |
| `fetch()` + pagination + URL sync | `useBrowseState` provides it |
| Loading state on delete buttons | `useCrudActions` provides `deleteLoadingId` |
| `try/catch` in event handlers | `useCrudActions` handles errors internally |

A new browse page requires: column definitions, a create form, and page-specific filter inputs. The structural repetition is gone.

---

## Summary

| Component / Hook | Layer | Job |
|---|---|---|
| `InlineNotice` | `ui/` | One message tile. Four tones: info, success, warning, danger |
| `StateSurface` | `ui/` | Full-page loading / error card (used in layouts and route-level error boundaries) |
| `DataTable<T>` | `master-data/` | Generic table. You define columns; it handles loading, empty, and layout |
| `BrowseFilterBar` | `master-data/` | Sort controls + Apply/Reset. Children slot for page-specific filters |
| `PaginationControls` | `master-data/` | Previous/Next with page count. Wires to `browse.setPage` |
| `NoticeStack` | `master-data/` | Compositor: shows `loadError`, `submitError`, `submitSuccess` |
| `ContextLinkChips` | `master-data/` | Row of navigation pill-links to related entities |
| Style constants | `browse-filter-bar.tsx` | Shared Tailwind class strings. One source of truth for all button and input styles |
| `useBrowseState` | `hooks/` | Fetch + filter + paginate + URL sync in one call |
| `useCrudActions` | `hooks/` | Create + update + delete with loading state and error routing |
