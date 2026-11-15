# Section D2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

## D-05 — The Browse UI Pattern

### D-05-1: `useBrowseState`: Draft vs Applied

[OPEN: src/hooks/use-browse-state.ts — show the two filter state pairs]

Two states for filters. Draft and applied.

The user types "Block" in the search box. The draft filter updates immediately. The table does not refetch.

The reason is that the data-loading `useEffect` depends on `appliedFilters`, not `filters`.

The user clicks Apply. `applyFilters()` copies draft to applied. It also increments `reloadKey` and sets page to 1. Then the `useEffect` fires and the fetch runs.

Now suppose the user types something and then clicks Reset instead. The draft is discarded. The table stays at the last applied state.

`pushQueryState` is called during Apply. It writes the current filters to the URL. Browser back and forward then navigate between filter states. Bookmarks work.

The hook is initialized from `useSearchParams()`. If the URL has `?q=Block+A&sortBy=createdAt`, the hook starts with those values.

So a bookmarked URL shows the correct data immediately.

**Takeaway: draft = what the user is typing. Applied = what the last search used. They are deliberately separate.**

---

### D-05-2: Wiring the UI Components

[OPEN: app/(dashboard)/blocks/page.tsx — show the JSX section]

Walk through the four components.

First, `BrowseFilterBar`. It takes the draft values and the Apply and Reset callbacks.

The sort selector uses `sortOptions`. These are defined in the page component, not in the hook. This keeps display labels out of the shared hook.

Second, `DataTable`. It uses `rowKey="id"`. Always use the primary key of the entity. Without a stable key, React re-mounts every row on re-render.

The table handles `loading`, which is a skeleton, and `loadError`, which is an inline error message. It does this internally. So the page component does not conditionally render the table.

Third, `PaginationControls`. It takes `page`, `totalPages`, `totalItems`, and `onPageChange`. It renders previous and next buttons and a page indicator.

Fourth, `NoticeStack`. It takes `submitError` and `submitSuccess` from the browse state. It shows colored banners. `useCrudActions` sets these after mutations.

**Takeaway: four components, same composition on every browse page. Learn one, know all.**

---

### D-05-3: `useCrudActions` and Inline Mutations

[OPEN: use-crud-actions.ts — show create() onSuccess pattern]

`useCrudActions` is initialized with the submit feedback callbacks from `useBrowseState`. This wires the two hooks together.

On a successful create, `onSuccess` receives the new record. The page component adds it to the start of `state.items` and increments `state.totalItems`.

There is no network refetch. The UI updates immediately.

On a successful delete, `onSuccess` filters the deleted ID out of `state.items`. It also decrements `totalItems`.

`deleteLoadingId` tracks which row is being deleted. Only the delete button of that row spins. The rest of the table stays interactive.

On failure, `setSubmitError` is called. The `NoticeStack` shows the red banner. The list is not modified.

**Takeaway: `onSuccess` updates local state. `onError` shows a notice. Neither triggers a page reload.**

---

## D-06 — Exercise: Build a Module

### D-06-1: The Task

[PAUSE: give students time to write their plan]

Do not open any code files yet.

Write down these four things. The Prisma model fields. The service functions you need. The route files you will create. The UI components you will use.

[WAIT — then show the task description and folder structure]

The module is ParkingSpace. It belongs to a block. It has a space number, a type (COVERED or OPEN), an optional note, and an optional unit assignment.

The folder structure is the same as every other module. It is `src/modules/parking-spaces/`, `app/api/parking-spaces/`, and `app/(dashboard)/parking-spaces/`.

**Takeaway: the structure is identical to every module in the codebase. The content is different. That's the point of the modular monolith.**

---

### D-06-2: Reference Solution

[WALK THROUGH: key decisions, not the full code]

The create service does not need an application-level uniqueness check for `[blockId, spaceNumber]`.

The `@@unique` constraint in the schema handles it. Prisma throws P2002. `fromUnknownError` maps it to CONFLICT. We write zero extra code.

The unit assignment rule is "at most one unit at a time." This rule is a check-then-write. It needs `$transaction(async tx => {...})`.

This is the only part of the module that requires the callback form of transaction.

The list page uses the same four components. The `useBrowseState` config adds a `type` filter. `sortOptions` includes `spaceNumber`.

**Takeaway: unique constraints in the schema save application-level checks. Only behavioral rules (check-then-write) require explicit transaction logic.**

---

### D-06-3: Module Wrap-Up

[SHOW: six-operation summary table]

Six operations. List, Create, Get, Update, Delete, and Complex Write. Every module is built from these six.

The table maps each operation to its server pattern and its client pattern. Memorize this table and you can build a module in any framework.

The operations are universal. Only the function names change.

One note on what is missing from the table. It is business logic.

Business logic is NOT one of the six operations. It lives inside the service functions that the operations call.

The six patterns are plumbing. Business logic is domain knowledge.

[FINAL CHALLENGE]

Here is your test. Build the parking space module without looking at existing module files.

If you can do it from memory, you have internalized the pattern.

**Section D complete.

Section E, Hardening, covers what separates a working prototype from a production deployment. It covers audit logging verification, performance indexes, and observability with Sentry.**
