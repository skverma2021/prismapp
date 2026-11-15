# Section D2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## D-05 — The Browse UI Pattern

### D-05-1: `useBrowseState`: Draft vs Applied

[OPEN: src/hooks/use-browse-state.ts — show the two filter state pairs]

Two states for filters. Draft and applied.

The user types "Block" in the search box. The draft filter updates immediately. The table does not refetch — because the data-loading `useEffect` depends on `appliedFilters`, not `filters`.

The user clicks Apply. `applyFilters()` copies draft → applied, increments `reloadKey`, and sets page to 1. The `useEffect` fires. The fetch runs.

If the user types something and then clicks Reset instead, the draft is discarded. The table stays at the last applied state.

`pushQueryState` is called during Apply, writing the current filters to the URL. Browser back/forward navigates between filter states. Bookmarks work.

The hook is initialized from `useSearchParams()`. If the URL has `?q=Block+A&sortBy=createdAt`, the hook starts with those values — so a bookmarked URL shows the correct data immediately.

**Takeaway: draft = what the user is typing. Applied = what the last search used. They are deliberately separate.**

---

### D-05-2: Wiring the UI Components

[OPEN: app/(dashboard)/blocks/page.tsx — show the JSX section]

Walk through the four components.

`BrowseFilterBar` — takes the draft values and the Apply/Reset callbacks. The sort selector uses `sortOptions` defined in the page component — not in the hook. This keeps display labels out of the shared hook.

`DataTable` — `rowKey="id"`. Always use the entity's primary key. Without a stable key, React re-mounts every row on re-render. The table handles `loading` (skeleton) and `loadError` (inline error message) internally. The page component doesn't conditionally render the table.

`PaginationControls` — takes `page`, `totalPages`, `totalItems`, `onPageChange`. Renders prev/next buttons and a page indicator.

`NoticeStack` — takes `submitError` and `submitSuccess` from the browse state. Shows colored banners. These are set by `useCrudActions` after mutations.

**Takeaway: four components, same composition on every browse page. Learn one, know all.**

---

### D-05-3: `useCrudActions` and Inline Mutations

[OPEN: use-crud-actions.ts — show create() onSuccess pattern]

`useCrudActions` is initialized with the submit feedback callbacks from `useBrowseState`. This wires the two hooks together.

On a successful create, `onSuccess` receives the new record. The page component prepends it to `state.items` and increments `state.totalItems`. No network refetch. The UI updates immediately.

On a successful delete, `onSuccess` filters the deleted ID out of `state.items` and decrements `totalItems`.

`deleteLoadingId` tracks which row is being deleted. Only that row's delete button spins. The rest of the table is interactive.

On failure, `setSubmitError` is called. The `NoticeStack` shows the red banner. The list is not modified.

**Takeaway: `onSuccess` updates local state. `onError` shows a notice. Neither triggers a page reload.**

---

## D-06 — Exercise: Build a Module

### D-06-1: The Task

[PAUSE: give students time to write their plan]

Don't open any code files yet. Write down: the Prisma model fields, the service functions you need, the route files you'll create, and the UI components you'll use.

[WAIT — then show the task description and folder structure]

ParkingSpace module. Belongs to a block. Space number, type (COVERED/OPEN), optional note, optional unit assignment.

The folder structure is the same as every other module: `src/modules/parking-spaces/`, `app/api/parking-spaces/`, `app/(dashboard)/parking-spaces/`.

**Takeaway: the structure is identical to every module in the codebase. The content is different. That's the point of the modular monolith.**

---

### D-06-2: Reference Solution

[WALK THROUGH: key decisions, not the full code]

The create service doesn't need an application-level uniqueness check for `[blockId, spaceNumber]`. The `@@unique` constraint in the schema handles it. Prisma throws P2002. `fromUnknownError` maps to CONFLICT. Zero extra code.

The unit assignment rule ("at most one unit at a time") is a check-then-write. It needs `$transaction(async tx => {...})`. This is the only part of the module that requires the callback form of transaction.

The list page uses the same four components. `useBrowseState` config adds a `type` filter. `sortOptions` includes `spaceNumber`.

**Takeaway: unique constraints in the schema save application-level checks. Only behavioral rules (check-then-write) require explicit transaction logic.**

---

### D-06-3: Module Wrap-Up

[SHOW: six-operation summary table]

Six operations. List, Create, Get, Update, Delete, Complex Write. Every module is built from these six.

The table maps each operation to its server pattern and its client pattern. Memorize this table and you can build a module in any framework — the operations are universal, only the function names change.

One note on what's missing from the table: business logic. Business logic is NOT one of the six operations. It lives inside the service functions that the operations call. The six patterns are plumbing. Business logic is domain knowledge.

[FINAL CHALLENGE]

Your test: build the parking space module without looking at existing module files. If you can do it from memory, you have internalized the pattern.

**Section D complete. Section E — Hardening — covers what separates a working prototype from a production deployment: audit logging verification, performance indexes, and observability with Sentry.**
