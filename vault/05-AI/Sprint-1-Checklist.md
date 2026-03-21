# Sprint 1 Checklist

Status: In Progress
Owner: Engineering
Last Updated: 2026-03-20

## Goal
Deliver Phase 1, slice 1: `blocks` and `units` APIs with deterministic validation and response envelopes.

## Scope for This Slice
1. CRUD for blocks.
2. CRUD for units.
3. CRUD for individuals.
4. Pagination/filter/sort for list endpoints.
5. Shared error envelope and stable domain error mapping.
6. Baseline smoke checks (lint/build + API sanity checks).

## Task Checklist
- [x] Add sprint checklist and references.
- [x] Add shared API response/error utility.
- [x] Add blocks module service + validation.
- [x] Add units module service + validation.
- [x] Add individuals module service + validation.
- [x] Implement `app/api/blocks` route handlers.
- [x] Implement `app/api/units` route handlers.
- [x] Implement `app/api/individuals` route handlers.
- [x] Add ownership/residency timeline APIs with overlap-prevention logic.
- [ ] Add auth/role guard middleware once AuthN/AuthZ approach is finalized.

## Endpoints in This Slice
1. `GET /api/blocks`
2. `POST /api/blocks`
3. `GET /api/blocks/:id`
4. `PATCH /api/blocks/:id`
5. `DELETE /api/blocks/:id`
6. `GET /api/units`
7. `POST /api/units`
8. `GET /api/units/:id`
9. `PATCH /api/units/:id`
10. `DELETE /api/units/:id`
11. `GET /api/individuals`
12. `POST /api/individuals`
13. `GET /api/individuals/:id`
14. `PATCH /api/individuals/:id`
15. `DELETE /api/individuals/:id`

## Notes
1. Unit uniqueness is enforced by DB constraint on `(blockId, description)`.
2. API envelope aligns with `vault/03-API/Error-Model.md` and `vault/03-API/Pagination-and-Filtering.md`.
3. Timeline overlap prevention is intentionally deferred to the next slice.
