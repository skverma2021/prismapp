# Walkthrough — `useBrowseState` (The Browse-Screen Engine)

`useBrowseState` answers one question, and only one: **"How does a browse screen work?"** Not "what does the Blocks screen do" (that's `page.tsx`) and not "how do I save a change" (that's `useCrudActions`). Search, filters, sorting, pagination, URL state, and the GET/loading/error lifecycle — all of it lives in this one hook, shared by every master-data browse page in PrismApp.

Read this after [units.md](units.md). Units is where you've already seen this hook in use; this walkthrough explains the mechanics underneath.

---

## Why a Shared Hook, Not Copy-Paste

Every browse screen — Blocks, Units, Individuals, Ownerships, Residencies, Contribution Heads — needs the same plumbing: a page number, a sort column, a sort direction, zero or more filters, a loading flag, an error message, and a way to keep all of that in sync with the URL so the back button and page refresh behave correctly.

Writing that logic once per page means six near-identical copies that drift apart over time — one page fixes a race condition, the other four don't. `useBrowseState<T, S>` is the single implementation. Each page supplies only what's entity-specific (the endpoint, the sort options, the filter keys) and gets the entire lifecycle back as one object.

```ts
const browse = useBrowseState<UnitItem, SortOption>({
  endpoint: "/api/units",
  errorMessage: "Unable to load units.",
  sortOptions: SORT_OPTIONS,
  defaultSortBy: "description",
  filters: [{ key: "q" }, { key: "blockId" }],
});
```

Two generic type parameters: `T` is the row shape (`UnitItem`), `S` is the union of valid sort fields (`"description" | "sqFt" | "createdAt"`). This is what gives every page full type safety on `browse.items` and `browse.sortBy` without the hook knowing anything about Units specifically.

---

## Draft vs. Applied State — the Key Concept

The hook tracks **two copies** of sort and filters: a draft copy (`sortBy`, `sortDir`, `filters`) and an applied copy (`appliedSortBy`, `appliedSortDir`, `appliedFilters`).

```ts
// Sort (draft) — what the <select> is currently showing
sortBy: S;
setSortBy: (value: S) => void;

// Sort (applied) — what the last fetch actually used
appliedSortBy: S;
```

Why two copies? Typing in a search box fires `onChange` on every keystroke. If every keystroke triggered a fetch, you'd refetch on every character typed — wasteful, and prone to out-of-order responses. The draft state (`filters`, `sortBy`, `sortDir`) is free to change as the user types or picks a dropdown value, with **no network effect**. Only `applyFilters()` promotes the draft into the applied state, and only the applied state is a dependency of the data-loading effect:

```ts
useEffect(() => {
  // ...
}, [appliedSortBy, appliedSortDir, page, reloadKey, ...Object.values(appliedFilters)]);
```

`BrowseFilterBar` (the shared search/sort UI component) calls `browse.applyFilters()` on blur or Enter, not on every `onChange`. That single design choice is what keeps every browse page from hammering the API while the user is mid-sentence in a search box.

---

## The URL Is the Source of Truth, Not `useState`

The most important architectural decision in this hook: filter/sort/page state is not treated as "local component state that happens to get mirrored to the URL." It's the reverse — **the URL is authoritative**, and component state is a read of it.

Two effects enforce this:

**1. URL → state**, whenever `searchParams` changes (back/forward navigation, a deep link, or a filter chip from another page):

```ts
useEffect(() => {
  const nextSortBy = parseSortBy(searchParams.get("sortBy"));
  const nextFilters = buildFilterRecord();
  setSortBy(nextSortBy);
  setAppliedSortBy(nextSortBy);
  setFilters(nextFilters);
  setAppliedFilters(nextFilters);
  setPage(1);
}, [searchParams]);
```

**2. State → URL**, whenever the user explicitly applies or resets:

```ts
const applyFilters = useCallback(() => {
  // ...
  pushQueryState(pathname, queryState);
}, [filters, pathname, sortBy, sortDir]);
```

`pushQueryState` (in [src/lib/url-query-state.ts](../../src/lib/url-query-state.ts)) calls `window.history.pushState` directly rather than Next's `router.push`, specifically to avoid a full Next.js navigation/re-render cycle for what is just a query-string change. It also bails out early if the computed URL is identical to the current one — without that guard, Next's `useSearchParams` would re-fire the first effect, which would reset `page` to `1`, which would trigger the data effect again: an infinite loop disguised as a no-op.

**Why this matters:** because state is derived from the URL and not the other way around, refreshing the page, using the back button, or sharing a link all reproduce the exact same filtered/sorted/paginated view. None of that is special-cased per page — it falls out of the architecture for free.

---

## The Data-Loading Effect

```ts
useEffect(() => {
  let stale = false;

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sortBy: appliedSortBy, sortDir: appliedSortDir });
      // ... apply filters into params
      const data = await fetchJsonWithRetry<PaginatedResponse<T>>(`${endpoint}?${params}`, errorMessage);
      if (stale) return;
      setItems(data.items);
      setTotalPages(Math.max(data.totalPages, 1));
      setTotalItems(data.totalItems);
    } catch (error) {
      if (stale) return;
      setLoadError(error instanceof Error ? error.message : errorMessage);
    } finally {
      if (!stale) setLoading(false);
    }
  }

  void load();
  return () => { stale = true; };
}, [appliedSortBy, appliedSortDir, page, reloadKey, ...Object.values(appliedFilters)]);
```

The `stale` flag is a manual cancellation token. If the dependencies change again before a fetch resolves (e.g., the user clicks "next page" twice quickly), the cleanup function sets `stale = true` for the first, now-abandoned `load()` call. When that older response finally arrives, its `if (stale) return` guards skip every state update — so a slow, stale response can never clobber a newer, faster one. This is a plain closure-based alternative to `AbortController`; it doesn't cancel the in-flight `fetch`, but it does guarantee the result is ignored.

`fetchJsonWithRetry` (in [src/lib/paginated-client.ts](../../src/lib/paginated-client.ts)) adds automatic retry with backoff for retryable failures (network `TypeError`s, or status codes like `429`/`503`) — the hook itself doesn't need to know about retry logic at all.

`buildParams`, if the page config supplies one, lets an entity override how filters map to query params (useful when a UI filter name doesn't match the API param name 1:1). Without it, every non-empty applied filter value is passed through as-is.

---

## `reload()` and the `reloadKey` Trick

```ts
const reload = useCallback(() => {
  setReloadKey((k) => k + 1);
}, []);
```

Sometimes a page needs to force a refetch without any filter, sort, or page actually changing — for example, after a mutation on another part of the screen invalidates the list. Since the data effect's dependency array has nothing that changes in that scenario, `reloadKey` exists purely as a dependency with no semantic meaning beyond "increment me to force the effect to re-run." It's a common React pattern for "trigger this effect on demand."

---

## Things Worth Noticing

**Initial state reads from the URL, not from defaults.** `useState<S>(() => parseSortBy(searchParams.get("sortBy")))` uses lazy initial state so the *very first* render and the *very first* fetch already reflect a deep-linked URL — there's no flash of default sort before the real sort kicks in.

**The `q` filter is sugar, not a special case.** `query` / `setQuery` are just `filters["q"]` / a setter that writes to `filters.q`. Any page that declares `{ key: "q" }` in its filter config automatically gets `browse.query` and `browse.setQuery` for free — it's a convenience accessor, not separate state.

**`submitError` / `submitSuccess` live here, not in `useCrudActions`.** This is the coupling point between the two hooks: `useCrudActions` doesn't hold its own notice state — it's handed `browse.setSubmitError` and `browse.setSubmitSuccess` as callbacks (see [use-crud-actions.md](use-crud-actions.md)). One hook owns browse/read state, the other owns mutation state, but both report through the same notice banner.

**The `eslint-disable-next-line react-hooks/exhaustive-deps` comments are deliberate, not oversights.** Several effects intentionally omit `searchParams`-derived helper functions or `appliedFilters` object identity from their dependency arrays — including them would cause the effect to re-run on every render because those values are recreated each render. The hook spreads `Object.values(appliedFilters)` into the array instead, which only changes when actual filter *values* change.

---

## What to Read Next

- **[use-crud-actions.md](use-crud-actions.md)** — the mutation half of every browse page; reads `browse.setSubmitError`/`setSubmitSuccess` as its only coupling to this hook.
- **`src/lib/url-query-state.ts`** and **`src/lib/paginated-client.ts`** — the two small utilities this hook builds on.
- **[units.md](units.md)** — see this hook wired into a real page, including how `BrowseFilterBar` drives `applyFilters()`.
