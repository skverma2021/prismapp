# Current Sprint Board

Status: Phase 4 CMM Sprint 0
Date: 2026-05-20
Owner: Engineering

## Purpose
Provide one short-horizon execution board for the active sprint window.

This file should stay concise and operational. Historical detail belongs in evidence or archived notes.

## Current Focus
Phase 3 Hardening is complete (2026-05-20). All 66 Track-A items done; only low-priority refactoring (6.5, 6.6) and deferred future-module designs (9.4–9.7) remain open.

**Current sprint: CMM Phase 4 Sprint 0.** Goal: build the Prisma schema, seed master data, and stand up the complaint creation + list API. Reference: `vault/CMM/cmm-vision.md`, `AGENTS.md §10`.

Previous milestones delivered:
- Week 6 hardening and shared component extraction complete.
- Request-ID logging, audit logging expansion, PII masking, and auth feedback polish — all complete.
- OAuth Phase 2 (Google + Microsoft), App Users screen, rate limiting, Sentry integration — all verified on Vercel production.
- 113 Vitest unit tests passing; GitHub Actions CI active.

## Done
1. Week 2 contribution scope completed and validated.
2. Public landing page added.
3. Dashboard shell layout added.
4. Role-aware home page added.
5. Shared navigation metadata added.
6. Shared page-header component added.
7. Shared state-surface component added.
8. Contributions route wrapped with shared shell layout.
9. Reports routes wrapped with shared shell layout.
10. Root metadata and visual baseline updated.
11. Lint passed after shell changes.
12. Build passed after shell changes.
13. Route smoke checks passed for `/`, `/home`, `/contributions`, transaction report, and paid/unpaid matrix.
14. Repeated inline notices were extracted into a shared component.
15. Contribution and report screens now use shell-owned role context.
16. Final Week 3 shell smoke notes were recorded.
17. The shell session contract is now routed through a generic auth-session provider.
18. Client-side API auth headers are now built from one shared session helper.
19. Auth.js credentials login baseline is implemented.
20. Dashboard, contributions, and reports routes now require authenticated session state.
21. Demo app users are seeded into Prisma for local sign-in.
22. Deterministic operational block and unit seed data was aligned to Nalanda, Vaishali, and Rajgir.
23. Contribution and report unit labels now use `Block, Unit` formatting.
24. Contribution capture initial loading was reduced by separating head loading from background unit loading.
25. Per-person contribution capture now filters to resident-eligible units.
26. Transactions report filter loading now handles all unit pages instead of only page 1.
27. Paid/unpaid matrix performance was improved by batching report queries.
28. Paid/unpaid matrix yearly semantics were corrected to use refMonth = 0 and a Year status column.
29. Contribution capture payer selection now uses an individual-name dropdown.
30. Contribution capture now distinguishes payer identity from operator session identity in the UI.
31. Route-handler authorization is now aligned with Auth.js-backed session resolution.
32. Public entry now shows explicit auth-required and signed-out feedback states.
33. Dashboard home now shows explicit role-denied feedback after protected-route redirects.
34. Login and sign-out flows now provide clearer local credential and redirect feedback.
35. Master-data shell navigation now includes blocks, units, and individuals.
36. Blocks management UI baseline is now available with search, pagination, create, edit, and delete.
37. Units management UI baseline is now available with block filter, search, pagination, create, edit, and delete.
38. Individuals management UI baseline is now available with gender filter, search, pagination, create, edit, and delete.
39. Read-only individual views now mask email and mobile in the UI baseline.
40. Ownership timeline UI baseline is now available with unit and individual filters, pagination, create, edit, delete, and transfer flow.
41. Residency timeline UI baseline is now available with unit and individual filters, pagination, create, edit, and delete.
42. Master-data shell navigation and dashboard home cards now include ownerships and residencies.
43. Contribution periods UI baseline is now available as a read-only seeded reference view with year and month filters.
44. Contribution heads UI baseline is now available with search, pagination, create, edit, and delete.
45. Contribution rates UI baseline is now available with head and active-date filters plus append-only rate creation.
46. Master-data shell navigation and dashboard home cards now include contribution periods, heads, and rates.
47. Ownership page lookups now load through one lightweight lookup endpoint so unit and individual dropdowns become available sooner.
48. Contribution rates now support retiring an existing rate window by editing its `toDt` and reference.
49. Unit inception date is now enforced as the lower bound for ownership and residency history.
50. Ownership history now blocks dates before inception, first-row gaps after inception, and in-place edit/delete operations.
51. Ownership and residency pages now load unit and individual dropdowns through dedicated lightweight lookup endpoints.
52. Residency history now supports constrained `toDt` edits so operators can mark when someone moved out without reopening the full row.
53. Retired contribution rates are now immutable and show as locked in the UI.
54. Sort controls are now exposed across the remaining browse pages that already had backend sort support.
55. Builder inventory system identity fields are now added to Individuals and migrated locally.
56. Unit creation now seeds builder inventory as the initial ownership row from `inceptionDt`.
57. Seed/backfill now fills missing opening and trailing ownership coverage with builder inventory rows.
58. Ownership UI is now transfer-first and no longer exposes direct ownership creation in the operator flow.
59. Ordinary individual browse and lookup flows now exclude system identities, including builder inventory.
60. Browse pages now write applied filter state back to the URL so filtered views are bookmarkable and shareable.
61. Paid/unpaid matrix now paginates row display at 25 units per page while preserving full filtered totals.
62. Contribution transactions and paid/unpaid matrix reports now hydrate from URL query state and preserve bookmarkable filter and page context.
63. Focused preview UAT passed for ownership continuity, picker filtering, and protected-route auth behavior on the deployed `preview/ownership-continuity` branch.
64. Latest preview deployment now includes the report lookup fix and improves transactions report filter activation from approximately `21s` to `7-8s` on Vercel preview.
65. First-pass cross-linking now connects blocks, units, individuals, ownerships, residencies, and contribution heads into contribution capture and filtered contribution reports.
66. Contribution capture now hydrates `headId`, `unitId`, and `depositedBy` from URL query context and shows matching working-context navigation chips.
67. Contribution rates and contribution periods now expose operator shortcuts into contribution capture and filtered transactions views.
68. Contribution success and correction success states now expose direct follow-through links into transactions, paid/unpaid, and prefilled repeat-capture flows.
69. Shared session-scoped lookup caching now covers repeated contribution, ownership, and residency lookup loads within the same authenticated browser session.
70. Blocks, units, individuals, contribution heads, contribution rates, and transactions report pages now retry transient protected-read failures instead of failing immediately on a single preview miss.
71. Contribution rates and transactions report filter setup now reuse lightweight cached contribution-head lookups instead of always loading heads through paginated browse endpoints.
72. Unknown `500`-class API failures are now logged server-side so remaining preview-only `Unexpected server error` cases can be traced in Vercel logs.
73. Ownership and residency timeline pages now retry their main paginated list reads instead of still relying on fail-fast first-load fetches.
74. The authenticated dashboard shell now prewarms common unit, individual, contribution-head, and resident-eligible lookup caches to reduce first-open dropdown latency after sign-in.
75. Linked master-data navigation now hydrates target-page filter state from the URL on first render so many-side pages no longer flash an unfiltered list before applying the incoming filter.
76. Ownership transfer and residency creation unit selectors now use direct controlled updates again so the chosen unit reliably sticks when selected.
77. Builder-inventory ownership bootstrap in the seed flow is now idempotent for matching gap-fill rows and trailing rows, preventing repeated seed runs from appending duplicate builder ownership entries.
78. Unit area is now locked once any per-sq-ft contribution has been recorded for that unit.
79. Residency creation now requires a non-system active owner on the residency start date and rejects system identities as residents.
80. Residency creation now loads a dedicated eligible-unit list so the create form only offers units whose current active owner is a real individual.
81. Ownership transfer now cleans up redundant future builder-inventory rows before enforcing continuity, so earlier bootstrap artifacts do not block a valid handover to a real owner.
82. A dedicated maintenance script now detects and can delete redundant builder-inventory ownership rows in dry-run or apply mode.
83. Lookup cache invalidation is now centralized through a shared `invalidateLookups()` core with a `LOOKUP_KEYS` registry, replacing per-key hand-rolled cleanup.
84. Blocks, contribution heads, and residencies mutation pages now invalidate affected lookup caches on create, update, and delete success.
85. Operator smoke test confirmed a newly created contribution head (Flying Club, Rs 5000, monthly, per person) propagated immediately through rate creation, contribution capture, transactions report, and paid/unpaid matrix without stale-cache issues.
86. Shared `ApiEnvelope<T>`, `PaginatedResponse<T>`, and `toErrorMessage()` types extracted to `src/types/api.ts`; 12 client-side files updated to remove inline duplicates.
87. Contribution-periods API sort default aligned from `id asc` to `refYear desc` to match UI expectation.
88. `@@index([contributionHeadId])` added to `Contribution` model for report queries filtering by head alone.
89. `AuditLog` model added to Prisma schema with indexes; `writeAuditLog()` utility created; wired into contribution creation and correction flows.
90. Audit writes placed outside business transaction due to `@prisma/adapter-pg` non-atomic interactive transaction limitation.
91. React error boundaries added for global, dashboard, contributions, and reports route groups.
92. Clean 404 page added at `app/not-found.tsx`.
93. Request-ID middleware added for all `/api/*` routes with UUID generation and header propagation.
94. `getRequestId()` export and structured JSON error logging added to `api-response.ts`.
95. Request-ID logging wired into 6 financial and report route handlers.
96. All 9 interactive transactions changed from `Serializable` to `ReadCommitted` across 5 service files.
97. Fixed driver-adapter transaction atomicity bug: audit writes moved outside `$transaction` after `@prisma/adapter-pg` partial commit discovered.
98. Fixed infinite render loop on transactions report caused by Next.js 16 `pushState` interception; URL comparison guard added to `url-query-state.ts`.
99. Fixed cold-start retry gap: contribution-periods page switched from raw `fetch()` to `fetchJsonWithRetry`.
100. Week 6 hardening evidence recorded in `Evidence/Week-6-Hardening-Complete.md`.
101. Vercel production deployment `a2f00ae` live with all Week 6 changes.
102. Shared table/filter/form extraction completed: `useBrowseState`, `useCrudActions`, `BrowseFilterBar`, `DataTable`, `NoticeStack` extracted; all 8 master-data browse pages refactored (~53% line reduction).
103. Next.js 16 proxy convention rename: `middleware.ts` → `proxy.ts`, function `middleware` → `proxy`.
104. Fixed `useBrowseState` URL filter initialization: filters and sort now hydrate from URL params on first render; stale-fetch race condition guarded with cleanup flag.
105. Fixed duplicate contribution cancellation: `createContributionCorrection` now checks for existing correction via `findFirst` inside transaction, returns 409 CONFLICT if already corrected.
106. Post-shared-extraction evidence recorded in `Evidence/Post-Shared-Extraction-Fixes.md`.
107. Request-ID logging wired into all 33 route handlers (was 6); all catch blocks now propagate `requestId` in error responses.
108. Full audit logging wired into all mutating service operations: blocks (BLOCK_CREATED/UPDATED/DELETED), units (UNIT_CREATED/UPDATED/DELETED), individuals (INDIVIDUAL_CREATED/UPDATED/DELETED), contribution heads (CONTRIBUTION_HEAD_CREATED/UPDATED/DELETED), contribution rates (CONTRIBUTION_RATE_CREATED/UPDATED), ownerships (OWNERSHIP_CREATED/TRANSFERRED), residencies (RESIDENCY_CREATED/UPDATED). All previously discarded `requireMutationRole` return values now captured as `actor` and passed through to service layer.
109. CSV export metadata enriched: both transaction and paid/unpaid matrix CSVs now include `reportTitle`, `generatedAt`, `generatedBy`, `generatedByRole`, per-filter lines (`filter.<key>,<value>`), and `rowCount`. Transactions CSV export cap raised from 100 rows to unbounded.
110. PII masking implemented: `src/lib/pii-mask.ts` created with `maskEmail`, `maskMobile`, and `maskIndividualPii<T>`. READ_ONLY role receives masked email/mobile on all individual API reads (`listIndividuals`, `getIndividualById`). SOCIETY_ADMIN and MANAGER roles receive unmasked values.
111. Maker-checker extension hooks added for correction workflows. Six new nullable columns added to `contributions` (`correctionStatus`, `correctionApprovedById`, `correctionApprovedAt`, `correctionRejectedById`, `correctionRejectedAt`, `correctionRejectionReason`). Migration `20260507100000_correction_status_hooks` backfills existing correction rows to `POSTED`. Service now writes `correctionStatus = POSTED` on every new correction (single-step, unchanged for users). `MAKER_CHECKER_ENABLED` constant controls future activation. Duplicate-correction guard updated to allow re-correction after a `REJECTED` entry. `CORRECTION_STATUS` constant and `CorrectionStatus` type exported from service. Lint: 0 errors.
112. `/api/units/lookups` performance regression fixed (Track-A 5.6). `listUnitLookups()` now returns only `{id, description, blockId}` — the 3,958-row block join is eliminated. New `/api/blocks/lookups` route returns `{id, description}[]` (3 rows). `loadUnitLookupsCached()` in `master-data-lookups.ts` now loads blocks and units in parallel and enriches units client-side so all `formatUnitLabel()` and sort calls continue to work. `BlockLookupOption` type and `LOOKUP_KEYS.blocks` added to the lookup registry. `invalidateBlockDependentLookups()` now invalidates both `blocks` and `units` cache keys.
113. `getRequestId` export and structured JSON error logging restored to `src/lib/api-response.ts`. These were recorded as done in vault (item 94, Track-A 4.2/4.3) but had regressed from the code, causing a build failure on all 33 route handlers. Build now passes.
114. Track-A 7.4 complete: Vitest v4.1.5 unit test framework set up. `vitest.config.ts` created; `test`, `test:watch`, and `test:coverage` scripts added to `package.json`. 6 pure helpers extracted from `contributions.service.ts` into `contributions.helpers.ts` for testability. 3 test files written: `contributions.helpers.test.ts` (33 tests), `contributions.schemas.test.ts` (17 tests), `ownerships.schemas.test.ts` (19 tests). All 69 tests pass; 0 lint errors; build clean.
115. Track-A 2.7 complete: Formal OWASP Top 10 (2021) gap review. Findings in `vault/00-Core/OWASP-Top10-Gap-Review.md`. A03/A08/A10 fully clear. Immediate actions taken: (1) HTTP security headers added to `next.config.ts` (X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy); (2) `npm audit fix` run; Next.js upgraded 16.2.0 → 16.2.6 patching high-severity DoS CVE (GHSA-q4gf-8mx6-v5v3); remaining 6 moderate vulns are transitive via `@prisma/dev` CLI (not shipped to production). Open: rate limiting (8.9), error tracker (4.6). All 69 tests pass; 0 lint errors; build clean.
116. Track-A 7.3 + 7.5 complete: 7.3 confirmed already done — all `test:api:*` scripts are self-contained with `Date.now()` uniqueness; `test:api:*` npm scripts already present in `package.json`; only seed dependency is current-year contribution periods and app users (both from `prisma db seed`). 7.5: `.github/workflows/ci.yml` added — runs on push/PR to master/main: install → lint → `npm test` (Vitest, no DB) → `npm run build` (dummy `DATABASE_URL` confirmed safe; Prisma connects lazily) → `npm audit --audit-level=high`. API integration scripts remain manual pre-deploy.
117. Track-A 8.9 complete: Rate limiting on auth endpoint. In-memory rate limiter added to `proxy.ts` (Next.js 16 proxy/middleware file). Targets `POST /api/auth/callback/credentials` — 5 attempts per IP per 15 minutes; returns `429 Too Many Requests` with `Retry-After` header. IP extracted from `x-forwarded-for` (Vercel standard; `request.ip` removed in Next.js 16). Key discovery: `proxy.ts` IS the Next.js 16 middleware file (build output now shows "Proxy (Middleware)") — `x-request-id` propagation that was previously in `proxy.ts` is now confirmed active. Closes OWASP A05-GAP-2 + A07-GAP-1. 0 lint errors; 69/69 tests pass; build clean.
118. Track-A 1.9 complete: Rate-period coverage warn option implemented. Rate continues to be resolved at `transactionDateTime` per Domain-Rules C2. Added `checkRatePeriodCoverage()` in `contributions.service.ts`: compares resolved rate's `fromDt` against earliest selected period's start date. If rate is newer than the period, `createContribution` returns `{ contribution, warning: string }`. API envelope extended (`src/types/api.ts`, `src/lib/api-response.ts`) to support optional `warning` on success responses. UI (`app/contributions/page.tsx`) shows amber "Rate coverage notice" after successful post when warning is present. Domain-Rules.md updated with the policy decision. 69/69 tests pass; build clean.
119. CMM Sprint 0 Task 1 complete: `ComplaintCategory`, `ComplaintPriority`, `Complaint`, `ComplaintNote` models added to `prisma/schema.prisma`. Back-relations wired on `Unit` (complaints) and `Individual` (reportedComplaints, assignedComplaints). `ComplaintNote` uses `actorUserId`/`actorRole` (V1 operator actor model) instead of an Individual FK, consistent with Contribution and AuditLog patterns. All indexes for `[unitId]`, `[status]`, `[categoryId]`, `[priorityId]`, `[reportedById]`, `[assignedToId]`, `[createdAt]`, `[complaintId]` added. `prisma validate` passes; lint 0 errors.
120. CMM Sprint 0 Tasks 2–4 complete: Migration `cmm_entities` applied (`npx prisma migrate dev --name cmm_entities`). `prisma generate` run. `seedComplaintCategories()` and `seedComplaintPriorities()` added to `prisma/seed.mjs`; seed succeeded (10 categories + 3 priorities). `src/lib/api-response.ts` restored: `getRequestId()` export added, `fromUnknownError(error, requestId?)` updated with optional requestId param, `logServerError()` updated with structured JSON format, `ok(data, status, warning?)` updated with optional warning. CMM service (`src/modules/complaints/complaints.service.ts`) implemented: `listComplaints`, `getComplaintById`, `createComplaint`, `addComplaintNote`, `listComplaintCategories`, `listComplaintPriorities`. CMM schemas (`src/modules/complaints/complaints.schemas.ts`): `COMPLAINT_STATUSES`, `NOTE_VISIBILITIES`, `parseCreateComplaintInput`, `parseCreateComplaintNoteInput`. Route handlers: `GET/POST /api/complaints`, `GET /api/complaints/[id]`, `POST /api/complaints/notes`, `GET /api/complaints/categories`, `GET /api/complaints/priorities`. Audit logging wired on COMPLAINT_CREATED and COMPLAINT_NOTE_ADDED. Lint: 0 errors.

## In Progress

None. Phase 3 complete.

## Next

### Phase 4 — CMM Sprint 0
1. ✅ Add CMM entities to Prisma schema: `ComplaintCategory`, `ComplaintPriority`, `Complaint`, `ComplaintNote`.
2. ✅ Write and apply migration for CMM schema.
3. ✅ Seed categories and priorities (from `vault/CMM/cmm-vision.md` §A.1 and §A.4).
4. ✅ Implement `POST /api/complaints` (SOCIETY_ADMIN/MANAGER only) and `GET /api/complaints` (read-role). Also `GET /api/complaints/[id]`, `POST /api/complaints/notes`, `GET /api/complaints/categories`, `GET /api/complaints/priorities`.
5. Implement complaint list page at `app/(dashboard)/complaints/`.
6. Wire navigation (`src/lib/navigation.ts` and `src/components/master-data/master-data-nav.tsx`).

### Low-Priority Refactoring (Track-A Open)
- **6.5** — Extract shared timeline overlap helpers (`rangesOverlap` etc.) used by both ownerships and residencies into a shared module. Deferred until a third timeline entity appears.
- **6.6** — Rename eligibility functions to domain-explicit names (`listResidencyEligibleUnitIds` → `listUnitsEligibleForResidencyCreation()`). Low risk; can be done opportunistically.

## Risks (Current)
1. Audit log writes are best-effort (outside transaction); a transient failure could leave a financial record without supplementary audit context. The contribution row remains the primary audit trail.
2. `@prisma/adapter-pg` interactive transaction limitation: any future multi-table writes must account for the fact that rollback is not guaranteed if a step after the commit fails.
3. In-memory rate limiter in `proxy.ts` resets on each Vercel cold-start; does not protect against distributed brute-force across multiple edge instances. Acceptable for V1 solo-operator context.

## References
1. `Product-Delivery-Strategy.md`
2. `Execution-Status.md`
3. `vault/CMM/cmm-vision.md`
4. `vault/06-Tracks/Track-A-TODO.md`
5. `Evidence/Week-6-Hardening-Complete.md`
6. `Evidence/Post-Shared-Extraction-Fixes.md`