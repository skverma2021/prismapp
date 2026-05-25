# Module Outline — D2: CRUD (Part 2 — Browse UI, Error Boundaries, Exercise)

> **This is Part 2 of Section D.** Part 1 is in [`../D1-crud/00-module-outline.md`](../D1-crud/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | D2 — CRUD: Data Operations (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | D1 — CRUD Part 1 (List + Pagination + Create + GET/PATCH/DELETE + Transactions) |
| Estimated duration | 21–24 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Configure `useBrowseState` and `useCrudActions` to wire a fully functional browse-and-edit UI page.
2. Explain what `error.tsx` catches (render tree errors) versus what it does not (failed API calls), and implement it correctly.
3. Build a complete module UI page from scratch using the existing API layer and hook infrastructure.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 5 | `05-browse-ui-pattern.md` | The Browse UI Pattern | 7 min |
| 5b | `05b-error-boundaries.md` | Error Boundaries in the App Router | 5 min |
| 6 | `06-crud-exercise.md` | Exercise: Build a Module | 7 min |

> **Note on 05b:** Slide `05b-error-boundaries.md` was added after the original Camtasia recording session.
> The `D2-crud-notes.md` speaker notes file does not yet include a narration entry for 05b.
> Add narration for 05b to `slides/D2-crud-notes.md` before recording.

---

## Key Takeaways (Part 2)

1. The `useBrowseState` hook separates draft state (what the user is typing) from applied state (what the last search used). This prevents a search firing on every keystroke.
2. `error.tsx` catches errors that occur during rendering, not HTTP errors from `fetch`. An API returning 500 does not trigger `error.tsx` unless the component throws while processing the response.
3. The `"use client"` directive on `error.tsx` is not optional — it is required by the Next.js App Router spec because `error.tsx` renders on the client after a hydration error.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/03-API/API-Spec.md` | 6 | Complaints endpoint spec (what the API layer provides) |
| `vault/03-API/Pagination-and-Filtering.md` | 5 | Filter and sort param contract |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `src/hooks/use-browse-state.ts` | 5 | `BrowseConfig`, `BrowseState`, draft vs applied pattern |
| `src/hooks/use-crud-actions.ts` | 5 | `create()`, `update()`, `delete()` |
| `src/types/api.ts` | 5 | `ApiEnvelope<T>`, `PaginatedResponse<T>` |
| `src/lib/paginated-client.ts` | 5 | `fetchJsonWithRetry` — retry on 5xx and network errors |
| `app/(dashboard)/error.tsx` | 5b | `"use client"` requirement, props contract |
| `app/reports/error.tsx` | 5b | Scoped error boundary example |
| `app/contributions/error.tsx` | 5b | Scoped error boundary example |
| `src/lib/navigation.ts` | 6 | Navigation wiring for exercise solution |

---

## Assessment / Discussion Questions

1. You have wired `useBrowseState` but the search fires on every keystroke. What configuration is likely missing?
2. A `fetch` call returns a 500 response. Does `error.tsx` trigger? Explain why or why not.
3. You add `error.tsx` to a route directory but forget `"use client"`. What happens at build time?
4. *Stretch:* The exercise uses `useBrowseState` with an `endpoint` string and a `filters` object. Why is the filter state kept separate from the URL params until the user explicitly triggers a search?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `src/hooks/use-browse-state.ts`; `app/(dashboard)/error.tsx`; completed complaints page (exercise reference) |
| Diagrams needed | Error boundary scope hierarchy diagram (05b) |
| Talking-head segments | Intro to Part 2 (30s); exercise intro (60s); wrap-up for full Section D (90s) |
| Pending | Add D2-crud-notes.md narration for 05b before recording |

---
