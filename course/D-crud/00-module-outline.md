# Module Outline — D: CRUD — Data Operations

## Identity

| Field | Value |
|---|---|
| Section | D — CRUD: Data Operations |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Section A (Scope); Section B (ERD); Section C (Technology) |
| Estimated duration | 40–45 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Implement a paginated list endpoint and explain how `db.$transaction([findMany, count])` prevents count drift.
2. Trace the create pattern end-to-end: parse → service → Prisma write → audit log → `ok(data, 201)`.
3. Implement GET by ID, PATCH, and DELETE route handlers using the correct response shape for each (200, 204).
4. Explain when a single Prisma call is insufficient and a serializable `$transaction` callback is required.
5. Configure `useBrowseState` and `useCrudActions` to wire a fully functional browse-and-edit UI page.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-list-and-pagination.md` | The List Pattern | 7 min |
| 2 | `02-create-pattern.md` | The Create Pattern | 7 min |
| 3 | `03-get-update-delete.md` | GET, PATCH, DELETE | 7 min |
| 4 | `04-complex-writes.md` | Transactions and Complex Writes | 7 min |
| 5 | `05-browse-ui-pattern.md` | The Browse UI Pattern | 7 min |
| 6 | `06-crud-exercise.md` | Exercise: Build a Module | 7 min |

---

## Key Takeaways

1. `db.$transaction([findMany, count])` ensures the item list and the total count are from the same database snapshot. Without this, a write between the two queries causes off-by-one pagination.
2. The create route handler does four things and nothing more: auth → parse → service → `ok(data, 201)`. All business logic lives in the service.
3. `DELETE` returns `204 No Content` — not `ok(data)`. There is no response body. Using `ok()` on a delete is a type error in the contract.
4. Temporal overlap checks and multi-row writes must be inside a `$transaction(async tx => ...)` callback. Application-level checks between two separate Prisma calls are not race-safe.
5. The `useBrowseState` hook separates draft state (what the user is typing) from applied state (what the last search used). This prevents a search firing on every keystroke.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/01-Domain/Domain-Rules.md` | 4 | Temporal Integrity Rules (overlap prevention), Financial Integrity Rules (immutability) |
| `vault/03-API/Pagination-and-Filtering.md` | 1 | Paginated response envelope, sort/filter param contract |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `src/modules/blocks/blocks.service.ts` | 1, 2, 3 | `listBlocks`, `getBlockById`, `createBlock`, `updateBlock`, `deleteBlock` |
| `app/api/blocks/route.ts` | 1, 2 | GET and POST handlers |
| `app/api/blocks/[id]/route.ts` | 3 | GET, PATCH, DELETE handlers; `await params` |
| `src/modules/blocks/blocks.schemas.ts` | 2, 3 | `parseCreateBlockInput`, `parseUpdateBlockInput` |
| `src/modules/ownerships/ownerships.service.ts` | 4 | `ensureNoOwnershipOverlap` inside a `$transaction` |
| `src/modules/contributions/contributions.service.ts` | 4 | Header + detail multi-row write inside a `$transaction` |
| `src/hooks/use-browse-state.ts` | 5 | `BrowseConfig`, `BrowseState`, draft vs applied pattern |
| `src/hooks/use-crud-actions.ts` | 5 | `create()`, `update()`, `delete()` |
| `src/types/api.ts` | 1, 5 | `ApiEnvelope<T>`, `PaginatedResponse<T>` |
| `src/lib/paginated-client.ts` | 5 | `fetchJsonWithRetry` — retry on 5xx and network errors |
| `src/lib/url-query-state.ts` | 5 | `pushQueryState` — URL sync without page reload |
| `app/(dashboard)/blocks/page.tsx` | 5 | Full browse page wiring `useBrowseState` + `useCrudActions` |

---

## Assessment / Discussion Questions

1. Why is `db.$transaction([findMany, count])` better than two separate `await db.X.findMany()` and `await db.X.count()` calls?
2. A route handler returns `ok(undefined)` for a delete operation. What problem does this cause for the client?
3. The `updateBlock` service reads the block before updating it. Why? What would a diff-based audit log miss if we skipped the pre-read?
4. A developer writes: `const overlap = await db.unitOwner.findMany(...); if (overlap.length > 0) throw ...; await db.unitOwner.create(...)`. Under high concurrency, what can go wrong? How does `$transaction(async tx => ...)` fix it?
5. *(Stretch)* `useBrowseState` has two states for each filter: `filters` (draft) and `appliedFilters` (used in the last query). Why not just have one? Give a concrete UX scenario where the split matters.

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `blocks.service.ts` (all five functions); `app/api/blocks/route.ts`; `app/api/blocks/[id]/route.ts`; `ownerships.service.ts` (transaction); `use-browse-state.ts` config shape; `app/(dashboard)/blocks/page.tsx` |
| Diagrams needed | Pagination snapshot diagram (topic 1); create pattern flow (topic 2); GET/PATCH/DELETE response shapes (topic 3); transaction race-condition diagram (topic 4); draft vs applied state model (topic 5) |
| Talking-head segments | Topic 4 intro (why transactions matter), module wrap-up |

---

## Status

- [ ] Slide scripts drafted (01–06)
- [ ] Speaker notes assembled (slides/D-crud-notes.md)
- [ ] Diagrams created
- [ ] PPT built
- [ ] Camtasia recorded
- [ ] Review pass complete
