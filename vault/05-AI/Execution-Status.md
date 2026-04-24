# PrismApp Execution Status

Status: In Progress
Date: 2026-04-24
Owner: Engineering

## Purpose
Provide one current execution snapshot that answers three questions:
1. What is done?
2. What is in progress?
3. What remains?

This document is intended to complement, not replace, roadmap and evidence artifacts.

## Objective Checkpoint Against Product Delivery Strategy

### Objective 1: Complete Contribution Module by end of Week 2
Status: Largely complete

Completed:
1. Contribution backend APIs are implemented.
2. Contribution capture UI is implemented.
3. Contribution correction flow is implemented.
4. Month-ledger helper is implemented.
5. Transactions report UI is implemented.
6. Paid/unpaid matrix UI is implemented.
7. CSV export flows are implemented for both reports.
8. Regression scripts were run successfully during Week 2 sign-off.
9. UAT and release-readiness artifacts were recorded.

Residual follow-up:
1. Continue UI cleanup and shell-level consolidation of repeated page-level state surfaces.
2. Maker-checker correction workflow remains deferred to later hardening.

### Objective 2: Establish platform shell: home page, navigation, authentication, and master data CRUD baseline
Status: Substantially complete for shell/auth baseline and first-pass master-data UI across core and contribution domains

Completed:
1. Public entry page is now present.
2. Shared dashboard shell with top-level navigation behavior is now present.
3. Role-aware home page is now present.
4. Existing contributions and reports routes now render inside shared shell layouts.
5. Auth.js credentials login baseline is implemented.
6. JWT-based browser session persistence is implemented.
7. Dashboard, contributions, and reports routes now require authenticated session state.
8. Prisma-backed app-user seed records are available for local authentication.
9. Master-data CRUD backend baseline already exists for blocks, units, individuals, ownerships, and residencies.
10. Contribution heads, rates, periods, and reports APIs already exist.
11. Blocks management UI baseline is implemented.
12. Units management UI baseline is implemented.
13. Individuals management UI baseline is implemented.
14. Ownership timeline UI baseline is implemented.
15. Residency timeline UI baseline is implemented.
16. Contribution periods UI baseline is implemented.
17. Contribution heads UI baseline is implemented.
18. Contribution rates UI baseline is implemented.

Not yet complete:
1. Shell-wide auth feedback is not yet uniform across every protected redirect path.
2. Shared table, filter-bar, and form-shell component library is not complete yet.
3. Cross-linking is implemented for the main operator paths, but secondary contribution surfaces still need follow-through.

### Objective 3: Keep architecture ready for Safety, Security, Events, and AI features without rework
Status: Partially complete by architecture, not by feature implementation

Completed:
1. Modular monolith structure is already in place.
2. Domain logic is server-side and organized by module.
3. App Router structure is being aligned toward shell-based module expansion.
4. Vault already contains future-module references and delivery guidance.

Not yet complete:
1. Shared policy middleware is not implemented as a reusable feature foundation yet.
2. Feature flags and extensibility hooks for future modules are not formalized yet.
3. Auth alignment still needs to be completed before future modules can be added cleanly.

Newly complete:
1. Audit logging for financial writes is now implemented (AuditLog model + writeAuditLog utility).
2. Observability baseline is now in place (error boundaries, request-ID middleware, structured logging).
3. Request tracing via `x-request-id` is now active on all API routes and wired into all 33 route handlers.
4. Full audit logging is now wired into all mutating service operations across blocks, units, individuals, contribution heads, contribution rates, ownerships, residencies, contributions, and corrections.
5. CSV export headers now include report title, actor role, individual filter rows, and row count metadata.
6. PII masking is now active for READ_ONLY role: email and mobile are masked in all individual read responses.

## Activities Done

### Foundation and Backend
1. Prisma and PostgreSQL integration are configured and working.
2. Database schema, migrations, and seed flows are in place.
3. Shared DB runtime access is implemented.
4. Shared API response envelope and domain error mapping utilities are implemented.
5. Server-side role guard utility is implemented.

### Master Data and Timeline Backend
1. Blocks API implemented.
2. Units API implemented.
3. Individuals API implemented.
4. Ownership timeline API implemented.
5. Residency timeline API implemented.
6. Ownership overlap prevention implemented.
7. Residency overlap prevention implemented.
8. Unit inception date (`inceptionDt`) is now modeled and enforced as a lower bound for ownership and residency timelines.
9. Ownership continuity now requires the first history row to start on the unit inception date and prevents internal gaps.
10. Ownership history is now immutable in place; direct edit and delete are blocked server-side.
11. Residency history now allows constrained end-date (`toDt`) updates while keeping unit, resident, and start date locked.
12. Retired contribution rates are now immutable in place.
13. Individuals now support system-identity flags used for builder inventory bootstrap.
14. Unit creation now automatically seeds builder inventory as the first ownership row from `inceptionDt`.
15. Seed/backfill now inserts builder ownership rows where units are missing opening or trailing ownership coverage.
16. System identities are excluded from ordinary individual browse and lookup APIs.
17. Contribution posting now rejects system identities as depositors.

### Contributions Domain
1. Contribution heads API implemented.
2. Contribution rates API implemented.
3. Contribution periods API implemented.
4. Contributions posting API implemented.
5. Contribution corrections API implemented.
6. Month-ledger API implemented.
7. Duplicate prevention rules implemented.
8. Rate locking implemented.
9. Financial immutability enforced.
10. Compensating correction flow implemented.

### Reports Domain
1. Transactions report API implemented.
2. Paid/unpaid matrix report API implemented.
3. Transactions CSV export implemented.
4. Paid/unpaid matrix CSV export implemented.
5. Transactions and paid/unpaid matrix report pages now hydrate bookmarkable filter and page state from the URL.
6. Contribution capture now accepts URL-prefilled `headId`, `unitId`, and `depositedBy` context.
7. Contribution success and correction success states now provide direct drill-through links back into report and repeat-capture flows.

### UI Delivered Through Week 2
1. Contribution capture screen implemented.
2. Correction flow embedded in contribution UI implemented.
3. Transactions report screen implemented.
4. Paid/unpaid matrix report screen implemented.
5. Error, empty, and loading behavior was hardened during Week 2.

### Master-Data UI Baseline
1. Blocks management screen implemented with search, pagination, and CRUD actions.
2. Units management screen implemented with block filter, pagination, and CRUD actions.
3. Individuals management screen implemented with gender filter, pagination, sort controls, and CRUD actions.
4. Ownership timeline screen implemented with filters, pagination, lightweight lookup loading, immutable history behavior, and transfer-first workflow.
5. Residency timeline screen implemented with filters, pagination, lightweight lookup loading, create flow, and constrained end-date edit behavior.
6. Contribution periods screen implemented as a read-only seeded reference view with year and month filters.
7. Contribution heads screen implemented with search, pagination, and CRUD actions.
8. Contribution rates screen implemented with head and active-date filters plus controlled retirement of current rates.
9. Master-data shell navigation and route metadata were added for blocks, units, individuals, ownerships, residencies, contribution periods, contribution heads, and contribution rates.
10. Dashboard home cards now link to ownership, residency, and contribution master-data workflows.
11. Read-only individuals view now masks email and mobile in the UI and API layer.
12. Gender types now have a dedicated read endpoint for the individuals form.
13. Units and individuals now expose lightweight lookup endpoints so timeline dropdowns do not wait on paged browse APIs.
14. Browse pages now sync applied filter state into the URL so filtered screens are bookmarkable and shareable.
15. First-pass contextual navigation chips now link blocks, units, individuals, ownerships, residencies, and contribution heads into contribution capture and filtered report views.
16. Contribution rates and contribution periods now include second-pass operator shortcuts into contribution capture and filtered transactions views.
17. Shared session-scoped lookup caching now covers repeated contribution, ownership, and residency lookup loads within the same authenticated session.
18. Remaining browse and reporting reads now retry transient preview failures on blocks, units, individuals, contribution heads, contribution rates, and transactions report.
19. Contribution-head filter setup on contribution rates and transactions report now uses the lightweight lookup path instead of the heavier paginated browse API.
20. Unknown `500`-class API failures are now logged server-side to improve preview diagnosis.
21. Ownership and residency timeline pages now retry their main paginated reads, which had remained fail-fast after earlier lookup-only hardening.
22. The authenticated dashboard shell now prewarms common lookup caches so unit, individual, contribution-head, and resident-eligible selectors can open faster on the first page visit after sign-in.
23. Target pages reached through contextual drill-through links now initialize from the incoming URL filter state immediately instead of briefly loading an unfiltered list first.
24. Ownership transfer and residency creation selectors now update selected unit values synchronously again, fixing the recent regression where units appeared in the dropdown but did not stay selected.
25. Builder bootstrap seed logic now avoids inserting duplicate builder ownership rows when the same gap or trailing segment is already present.
26. Units now reject `sqFt` edits after any per-sq-ft contribution exists for that unit.
27. Residency creation now rejects system identities and blocks residency start while the active owner is still builder inventory.
28. Residency creation now uses a dedicated ownership-based eligible-unit lookup so builder-inventory units are excluded from the create dropdown before submission.
29. Ownership transfer now removes redundant future builder-inventory rows before applying continuity checks, while still rejecting genuine future ownership plans.
30. A dedicated maintenance script now exists to remove redundant builder-inventory ownership rows directly from the database when cleanup is preferred over runtime repair.

### Week 6 Hardening

#### Hotspot A: Lookup Cache Registry
1. Lookup cache invalidation centralized through a shared `invalidateLookups()` core with a `LOOKUP_KEYS` registry, replacing per-key hand-rolled cleanup.
2. Missing invalidation wired into blocks (create/update/delete), contribution heads (create/update/delete), and residencies (create/edit) mutation pages.
3. New semantic invalidation wrappers added: `invalidateBlockDependentLookups`, `invalidateContributionHeadLookups`, `invalidateResidencyDependentLookups`.
4. Operator smoke test confirmed new contribution head (Flying Club) propagated through rate creation, capture, and reports without stale-cache issues.

#### Hotspot B: Shared Error Envelope Audit
5. Created shared `src/types/api.ts` with `ApiEnvelope<T>`, `PaginatedResponse<T>`, and `toErrorMessage()`.
6. Updated 12 client-side files to use shared types, removing inline duplicates.

#### Hotspot C: Pagination/Sort Consistency
7. Audited all API endpoints for sort-default mismatches with UI pages.
8. Fixed contribution-periods API default sort from `id asc` to `refYear desc` to match UI expectation.

#### Hotspot D: Query Index Review
9. Audited all 58 Prisma queries against schema indexes.
10. Added `@@index([contributionHeadId])` to `Contribution` model for report queries filtering by head alone.

#### Hotspot E: Audit Logging for Financial Writes
11. Added `AuditLog` model with indexes on `(entityType, entityId)`, `actorUserId`, and `createdAt`.
12. Created `src/lib/audit-log.ts` utility with `writeAuditLog()`.
13. Wired audit logging into contribution creation and correction flows.
14. Audit writes placed outside business transaction due to `@prisma/adapter-pg` non-atomic interactive transaction limitation. Failures logged but never propagate.
15. Migration `20260415022708_audit_log` applied (audit_logs table + contributionHeadId index).

#### Hotspot F: Observability Baseline
16. Added React error boundaries: `global-error.tsx`, `(dashboard)/error.tsx`, `contributions/error.tsx`, `reports/error.tsx`.
17. Added clean 404 page at `app/not-found.tsx`.
18. Added `middleware.ts` with request-ID generation and propagation for all `/api/*` routes.
19. Enhanced `src/lib/api-response.ts` with `getRequestId()`, structured JSON error logging, and optional `requestId` parameter.
20. Wired request-ID logging into 6 financial/report route handlers.

#### Bug Fixes During Hardening
21. Fixed driver-adapter transaction atomicity issue: moved audit writes outside `$transaction` after discovering `@prisma/adapter-pg` does not guarantee interactive transaction atomicity.
22. Fixed infinite render loop on transactions report page caused by Next.js 16 `pushState` interception. Added URL comparison guard in `url-query-state.ts`.
23. Fixed cold-start retry gap: contribution-periods page switched from raw `fetch()` to `fetchJsonWithRetry`.

#### Transaction Isolation Alignment
24. Changed all 9 interactive transactions from `Serializable` to `ReadCommitted` across 5 service files (units, residencies, ownerships, contribution-rates, contributions).

### Post Week 2 UX and Reporting Corrections
1. Deterministic block and unit seeding aligned to Nalanda, Vaishali, and Rajgir with 14 floors x 8 units each.
2. Shared unit label formatting was added so operator-facing screens show `Block, Unit` labels.
3. Contribution capture unit loading was reworked to avoid blocking first render on all unit pages.
4. Per-person contribution heads now filter unit options to resident-eligible units.
5. Transactions report filter loading now handles full paginated unit data instead of only the first page.
6. Paid/unpaid matrix report performance was improved by removing per-unit query loops.
7. Paid/unpaid matrix yearly semantics were corrected so yearly heads use refMonth = 0 and display as Year, not January.
8. Contribution capture payer selection now uses an individual-name dropdown instead of a raw ID text box.
9. Contribution capture copy now distinguishes payer identity (`depositedBy`) from operator session identity (`actorUserId` / `actorRole`).
10. Paid/unpaid matrix now paginates unit rows at 25 rows per page while keeping totals and CSV export scoped to the full filtered dataset.

### Week 2 Validation and Release Readiness
1. Lint passed during Week 2 sign-off.
2. Build passed during Week 2 sign-off.
3. API regression suites passed during Week 2 sign-off.
4. UAT checklist and release-readiness docs were added.
5. A Vercel preview deployment for `preview/ownership-continuity` is recorded as ready for review.
6. Focused preview UAT for ownership continuity and protected-route auth behavior has now been recorded as passing.
7. Preview deployment now includes the report lookup fix and improved transactions report filter activation to approximately `7-8s` on Vercel.

### Shell and Auth Activities Completed
1. Read relevant App Router docs from installed Next.js docs before shell changes.
2. Added new public landing page route at `app/(public)/page.tsx`.
3. Added dashboard route group and role-aware home page at `app/(dashboard)/home/page.tsx`.
4. Added shared dashboard shell component with role-aware menu visibility.
5. Added shared navigation metadata and breadcrumb helpers.
6. Added shared page-header component.
7. Added shared state-surface component for loading/error/info blocks.
8. Wrapped contributions route in a shared shell layout.
9. Wrapped reports routes in a shared shell layout.
10. Added route-level loading surfaces for dashboard, contributions, and reports.
11. Updated root app metadata and visual baseline styling.
12. Updated existing report page home links to target the new dashboard home route.
13. Revalidated lint and build after shell changes.
14. Smoke-tested key UI routes successfully.
15. Extracted repeated inline loading, warning, success, and error notices into a shared component.
16. Moved contribution and report screens to shell-owned session context.
17. Removed duplicated per-page report access panels.
18. Recorded final shell smoke notes.
19. Replaced earlier mock-oriented shell session imports with a generic auth-session provider contract.
20. Centralized client-side auth header construction for contribution and report requests.
21. Added Auth.js credentials login with JWT-based browser session persistence.
22. Added server-side session guards for dashboard, contributions, and report layouts.
23. Added Prisma-backed app-user seed records for local authentication.
24. Aligned route-handler authorization with Auth.js-backed session resolution.
25. Added public-entry auth-required and signed-out feedback states.
26. Added dashboard role-denied feedback after protected-route redirects.
27. Added clearer login credential guidance and sign-out redirect feedback.

## Activities In Progress

1. Continue shell-level auth feedback refinements beyond the current public-entry and home redirect states.
2. Standardize shared table, filter, and form patterns across the new operator pages.
3. Push the latest second-pass cross-link changes and verify the new deep-link flows on preview.
4. Continue non-blocking performance tuning where preview latency remains materially above localhost, with unit dropdown latency still the clearest remaining gap.
5. Verify that the latest preview candidate removes the remaining transient first-load failures previously seen on ownership and residency after logout-login.
6. Re-check whether report refresh times now represent pure query latency rather than avoidable filter-setup delay.
7. Verify that cross-linked drill-throughs apply filtered rows immediately on preview and that ownership/residency unit selectors keep the chosen unit value.
8. Verify that unit area is immutable after per-sq-ft contributions and that residency cannot start until builder inventory has been replaced by a real owner.
9. Verify that the create-residency unit dropdown now excludes builder-inventory units entirely and that builder-inventory attempts no longer surface generic failures.
10. Verify that builder-owned units with old bootstrap artifacts can still be transferred to a real owner without manual data cleanup.

## Activities Yet To Be Performed

### Auth and Shell Follow-Through
1. Complete the remaining auth feedback surfaces across login, redirect, and protected-route states.
2. Remove any remaining test-style auth assumptions from operator-facing flows while preserving payer-versus-operator separation in contribution capture.

### Week 5: Master Data UI Baseline
1. Complete any remaining browse-page sort coverage and normalize control placement across module screens.
2. Finish timeline UX hardening around ownership continuity, residency end-date maintenance, and rate-history messaging.
3. Decide whether contribution periods stay reference-only or gain linked drill-through usage.
4. Decide whether contribution periods should remain reference-only or gain additional drill-through behaviors beyond report navigation.

### Current Branch Validation
1. Confirm newly created units show builder inventory as the initial owner from `inceptionDt`.
2. Confirm ownership transfer replaces builder inventory or the current natural owner without gaps.
3. Confirm builder inventory never appears in people-management, residency, or depositor pickers.
4. Confirm unauthenticated protected-route attempts redirect to auth-required login feedback.
5. Confirm `READ_ONLY` users are denied from contribution capture while reports remain accessible.

Validation status:
1. All current branch validation checks above are now recorded as passing in `Evidence/Ownership-Continuity-Preview-UAT.md`.

### Shared UI and Platform Work
1. Create reusable table component baseline.
2. Create reusable filter-bar baseline.
3. Create reusable form-shell baseline.
4. Add masked PII behavior for read-only contexts where required.
5. Add audit metadata visibility where operator workflows need it.

### Latest Operator UX Progress
1. Browse-page sort controls are now exposed on blocks, units, ownerships, residencies, contribution heads, contribution rates, and contribution periods.
2. Sort state is now applied explicitly through the existing API `sortBy` and `sortDir` contracts instead of relying only on fixed defaults.

### Hardening and Production Readiness
1. ~~Add audit logging for mutation flows.~~ Done (Week 6 Hotspot E).
2. ~~Add observability baseline.~~ Done (Week 6 Hotspot F).
3. ~~Add request tracing or structured request correlation.~~ Done (Week 6 Hotspot F).
4. ~~Review performance-sensitive report queries and indexes.~~ Done (Week 6 Hotspot D).
5. Resolve current PostgreSQL SSL warning semantics in `DATABASE_URL` handling.
6. Prepare for maker-checker extension hooks in corrections.
7. Promote from preview to a production-ready release only after ownership-continuity UAT is recorded.
8. Wire request-ID logging into remaining non-financial route handlers.
9. Extend audit logging to non-financial mutations (ownership transfers, residency changes) if required.

### Deferred Future Work
1. Auth Phase 2: OAuth and account linking.
2. Safety module MVP.
3. Security module MVP.
4. Events module MVP.
5. AI read-only assistant MVP.

## Current Recommendation
1. Treat the contribution module as functionally complete for current V1 scope.
2. Treat shell and auth baseline as delivered enough to keep tightening master-data correctness and operator UX.
3. Prioritize builder-based ownership continuity rollout, browse-page sort consistency, and shared operator-screen patterns before any production cutover.
4. Keep future modules deferred until auth alignment and master-data UI baselines are stable.
5. Treat the current Vercel preview deployment as the review surface for ownership continuity, while recognizing local report URL-state changes are newer than the last recorded deployed commit.
6. Use the recorded preview UAT pass and the latest preview verification as the basis for moving on to the next operator UX priorities rather than repeating the same deployment checks.