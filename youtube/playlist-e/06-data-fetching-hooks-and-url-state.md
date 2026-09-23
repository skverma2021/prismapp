# Playlist E · Episode 6 — "Data Fetching, Custom Hooks, and the URL as State"

## Video Metadata

- **Playlist:** E — Next.js Through the Real Application (app-agnostic; episodes
  accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** Client-Side Application Behavior (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show how this app fetches and paginates list data client-side,
  and how filters get pushed into the URL with `useSearchParams`/`history.pushState`
  so a filtered report is bookmarkable and shareable.
- **Title options:**
  1. Data Fetching, Custom Hooks, and the URL as State
  2. Why the Filter You Applied Is Sitting in the Address Bar
  3. One Hook Behind Every Browse Screen
- **Thumbnail concept:** A browser address bar with `?refYear=2026&headId=3`
  highlighted, with an arrow pointing down to a filtered report table.
- **Teaching principle:** Application behavior → framework requirement → Next.js
  solution.

---

## Cold Open (0:00–0:20)

**Visual:** Talking head.

**Narration:**
> "Apply a filter on a report in this app, and the URL updates. Refresh the page,
> or send that link to a colleague, and the same filter is still applied. That's
> not an accident — it's a deliberate choice to treat the URL itself as part of
> the application's state, not just an address."

---

## Scene 1 — One hook behind every browse screen (0:20–1:45)

**Visual:** Open `src/hooks/use-browse-state.ts`, the data-loading `useEffect`,
~lines 188–210.

**Code shown:**
```ts
useEffect(() => {
  let stale = false;

  async function load() {
    setLoading(true);
    setLoadError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy: appliedSortBy,
        sortDir: appliedSortDir,
        // ...applied filters
      });
      const response = await fetch(`${endpoint}?${params}`);
      // ...
      if (!stale) { setItems(data.items); /* ... */ }
    } catch { /* ... */ }
  }

  load();
  return () => { stale = true; };
}, [/* page, pageSize, appliedSortBy, appliedSortDir, appliedFilters */]);
```

**Narration:**
> "`useBrowseState` is the client-side data-fetching hook every master-data list
> in this app is built on. It builds a query string from the current page,
> page size, sort, and applied filters, fetches it, and sets the results into
> state. The `stale` flag is the important defensive detail: if the filters
> change again before this fetch resolves — someone typing fast in a search box —
> the *older* response is thrown away instead of overwriting newer results. This
> is the client-side data-fetching problem Server Components don't have to solve,
> because a Server Component's fetch simply blocks rendering until it resolves."

---

## Scene 2 — The URL updates the state, not just the reverse (1:45–3:00)

**Visual:** The earlier `useEffect` in the same hook that watches `searchParams`
and resets `filters`/`sortBy`/`page` from it, ~lines 172–186.

**Narration:**
> "This hook doesn't just read the URL once on mount — it watches
> `useSearchParams()`'s return value, and whenever it changes, re-derives filters,
> sort, and resets to page 1. That means the URL isn't a one-way output of this
> hook's state; it's genuinely the source of truth. Navigate back in the browser,
> and the filters that were active on the previous URL come back, because the hook
> re-reads them from `searchParams` again."

---

## Scene 3 — Writing to the URL without a full navigation (3:00–4:15)

**Visual:** Open `src/lib/url-query-state.ts`, `pushQueryState`, full function.

**Code shown:**
```ts
export function pushQueryState(pathname: string, values: Record<string, QueryValue>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    // ...skip undefined/null, normalize booleans and strings
  }
  const nextUrl = /* pathname + "?" + params, or just pathname */;

  const currentUrl = `${window.location.pathname}${window.location.search}`;
  if (nextUrl === currentUrl) return; // avoid re-render loops

  window.history.pushState(null, "", nextUrl);
}
```

**Narration:**
> "Applying a filter calls `pushQueryState`, which builds a clean query string and
> calls the browser's own `history.pushState` directly — not `router.push`. The
> comment in the code explains why the early-return guard matters: Next.js
> intercepts `pushState` and re-fires `useSearchParams()` on every call, so pushing
> an identical URL would trigger Scene 2's effect again for no reason, and could
> loop. This is browser-native history manipulation, deliberately kept simple,
> feeding back into Next.js's own reactive `useSearchParams` hook."

---

## Scene 4 — Reading it back out, on a real report page (4:15–5:15)

**Visual:** Open `app/reports/contributions/transactions/page.tsx`, the
`usePathname`/`useSearchParams` import and `const searchParams = useSearchParams();`
line (~line 212).

**Narration:**
> "And here's the other end: the transactions report reads `useSearchParams()`
> directly to initialize its filter state on load. Apply a filter, `pushQueryState`
> writes it to the address bar, `useSearchParams` picks it back up on next render,
> and the whole loop is how a filtered report URL becomes something you can
> bookmark, share in a chat message, or hit 'back' through — all without a full
> page reload."

---

## Outro / CTA (5:15–5:45)

**Visual:** End card pointing to Episode 7.

**Narration:**
> "This episode assumed the fetches all succeed. Next: what this app actually
> shows the user when one doesn't."

---

## Production Notes

- **Screen recordings needed:** `src/hooks/use-browse-state.ts` (both `useEffect`
  blocks, ~lines 172–210), `src/lib/url-query-state.ts` (`pushQueryState`, full
  function), `app/reports/contributions/transactions/page.tsx` (imports + line
  ~212 `useSearchParams()` usage).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** a short screen recording of applying a filter on the real
  transactions report and pointing out the address bar changing would sell this
  episode well, if available.
