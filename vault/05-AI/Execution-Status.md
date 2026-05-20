# PrismApp Execution Status

Status: Phase 3 Hardening Complete — CMM Sprint 0 Ready
Date: 2026-05-20
Owner: Engineering

## Purpose
Provide one current execution snapshot that answers three questions:
1. What is done?
2. What is in progress?
3. What remains?

This document is intended to complement, not replace, roadmap and evidence artifacts.

## Objective Checkpoint Against Product Delivery Strategy

### Objective 1: Complete Contribution Module by end of Week 2
Status: ✅ Complete

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

Residual follow-up — all resolved:
1. UI cleanup completed; shared `DataTable`, `BrowseFilterBar`, `NoticeStack`, `useBrowseState`, `useCrudActions` extracted.
2. Maker-checker correction workflow fully implemented: approval/rejection UI at `/contributions/corrections`, self-submission guard, `MAKER_CHECKER_ENABLED` flag (default off). See item 3.7 in Track-A-TODO.
3. CMM formally added to backlog and fully specced in vault. Phase 4 Sprint 0 ready.

### Objective 2: Establish platform shell: home page, navigation, authentication, and master data CRUD baseline
Status: ✅ Complete

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

Previously open items — all resolved:
1. Shell-wide auth feedback is now uniform: SOCIETY_ADMIN-only routes redirect with `auth=denied&from=<name>` and home page shows `InlineNotice`.
2. Shared table/filter-bar/form components fully extracted: `DataTable`, `BrowseFilterBar`, `NoticeStack`, `useBrowseState`, `useCrudActions`. All 8 master-data browse pages refactored.
3. Cross-linking complete across all operator paths including contribution capture, reports, and correction flow.

### Objective 3: Keep architecture ready for Safety, Security, Events, and AI features without rework
Status: ✅ Architecture ready; deferred future-module designs (9.4–9.7) remain as low-priority backlog

Completed:
1. Modular monolith structure is already in place.
2. Domain logic is server-side and organized by module.
3. App Router structure is being aligned toward shell-based module expansion.
4. Vault already contains future-module references and delivery guidance.

Status notes:
1. Shared policy middleware not yet formalized as a general pattern (deferred to CMM implementation).
2. Feature flags for future modules not formalized (deferred).
3. Auth is complete: credentials + OAuth Phase 2 (Google + Microsoft) both implemented.

Newly complete:
1. Audit logging for financial writes is now implemented (AuditLog model + writeAuditLog utility).
2. Observability baseline is now in place (error boundaries, request-ID middleware, structured logging).
3. Request tracing via `x-request-id` is now active on all API routes and wired into all 33 route handlers.
4. Full audit logging is now wired into all mutating service operations across blocks, units, individuals, contribution heads, contribution rates, ownerships, residencies, contributions, and corrections.
5. CSV export headers now include report title, actor role, individual filter rows, and row count metadata.
6. PII masking is now active for READ_ONLY role: email and mobile are masked in all individual read responses.
7. Maker-checker extension hooks added: `correctionStatus`, approval, and rejection fields added to `Contribution` model; migration `20260507100000_correction_status_hooks` applied; existing corrections backfilled to `POSTED`; `MAKER_CHECKER_ENABLED` flag and `CORRECTION_STATUS` constant added to service; duplicate-correction guard updated to allow re-correction after `REJECTED` entries.
8. CMM planning complete: `vault/CMM/cmm-vision.md` reformatted as a proper vault spec; complaint rules added to `Domain-Rules.md`; `ComplaintCategories`, `ComplaintPriorities`, `Complaints`, and `ComplaintNotes` entities added to `Entities.md` and `ERD.md`; `System-Overview.md` and `Glossary.md` updated; `AGENTS.md` scope control section updated to distinguish CMM (next module) from still-deferred modules.
9. Auth Phase 2 (Track-A 2.6) complete: Google + Microsoft OAuth via `next-auth/providers/google` and `next-auth/providers/azure-ad`. Email-matching strategy — `AppUser` must pre-exist. `enabledOAuthProviders` export controls button rendering (conditional on env vars). `signIn` callback gates inactive/missing accounts to `/?auth=oauth-denied`. Credentials flow remains as fallback. `.env.example` updated.
10. Uniform auth feedback (Track-A 2.8) complete: Server-side `layout.tsx` guards added for `/app-users`, `/audit-log`, and `/contributions/corrections`. All redirect to `/home?auth=denied&from=<name>`. `requireServerAppSession({ allowedRoles: ["SOCIETY_ADMIN"] })` helper wired.
11. App Users management screen (Track-A 8.8) complete: `/app-users` (SOCIETY_ADMIN only). `GET/POST /api/app-users` and `GET/PATCH /api/app-users/[id]`. `bcrypt` cost 12. Audit log entries for `APP_USER_CREATED` and `APP_USER_UPDATED`.
12. Maker-checker correction UI (Track-A 3.7) complete: per-card approve/reject flow at `/contributions/corrections`. Maker ≠ checker enforced. Rejection reason required. SOCIETY_ADMIN only. Nav entry added.
13. Sentry integration (Track-A 4.6) complete: `@sentry/nextjs@10.53.1`. `instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation.ts`, `withSentryConfig` wrapper. Verified on Vercel production 2026-05-18. DSN via `NEXT_PUBLIC_SENTRY_DSN`.
14. Rate limiting on auth (Track-A 8.9) complete: In-memory limiter in `proxy.ts` targeting `POST /api/auth/callback/credentials` — 5 attempts per IP per 15 min, returns 429 with `Retry-After`. Closes OWASP A05-GAP-2 + A07-GAP-1.
15. Temporal edge case test coverage (Track-A 7.6) complete: `checkRatePeriodCoverage` moved to `contributions.helpers.ts` (10 tests). `rangesOverlap`, `addDays`, `ensureNotBeforeUnitInception` extracted to `ownerships.helpers.ts` (23 tests) and `residencies.helpers.ts` (11 tests). Total: 113 tests passing.
16. CI pipeline (Track-A 7.5) complete: `.github/workflows/ci.yml` runs on push/PR to master/main — install → lint → `npm test` → `npm run build` → `npm audit --audit-level=high`.
17. Database backup (Track-A 8.6) complete: `scripts/backup-db.mjs` pg_dump wrapper + `npm run backup:db`. Vercel Postgres PITR (7-day free, 30-day Pro) as automatic backup layer.
18. Phase 3 Hardening complete: All Track-A gates met. 66/72 items done; 6 remaining are low-priority refactoring (6.5, 6.6) and deferred future-module designs (9.4–9.7).

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

None. Phase 3 Hardening complete as of 2026-05-20.

## Activities Yet To Be Performed

### Phase 4 — CMM Sprint 0
1. Add CMM entities to Prisma schema: `ComplaintCategory`, `ComplaintPriority`, `Complaint`, `ComplaintNote`.
2. Seed categories (Plumbing, Electrical, Civil, Lift, Security, Housekeeping, Parking, Noise, Common Area Misuse, Billing Dispute) and priorities (P1/P2/P3 with SLA targets).
3. Implement `GET /api/complaints` and `POST /api/complaints` with role guards.
4. Add complaint creation UI and complaint list page to dashboard.
5. Full CMM spec: `vault/CMM/cmm-vision.md`.
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
5. ~~Resolve PostgreSQL SSL warning semantics in `DATABASE_URL` handling.~~ Done (8.5).
6. ~~Maker-checker extension hooks in corrections.~~ Done (3.7 — approval/rejection UI active).
7. ~~Wire request-ID logging into remaining non-financial route handlers.~~ Done (all 33 handlers).
8. ~~Extend audit logging to non-financial mutations.~~ Done (ownerships, residencies, master-data).
9. ~~Auth Phase 2: OAuth.~~ Done (2.6 — Google + Microsoft providers active).
10. ~~Rate limiting on auth endpoint.~~ Done (8.9).
11. ~~Sentry error tracking.~~ Done (4.6 — verified on Vercel production 2026-05-18).
12. ~~App Users management screen.~~ Done (8.8).
13. ~~OWASP Top 10 review.~~ Done (2.7).
14. ~~CI pipeline.~~ Done (7.5 — GitHub Actions).

### Deferred Future Work (Unchanged)
1. Safety module MVP.
2. Security module MVP.
3. Events module MVP.
4. AI read-only assistant MVP.

## Current Status (2026-05-20)
Phase 3 Hardening is complete. All 66 Track-A items are done. 6 items remain as deliberate deferrals:
- **6.5** — Timeline overlap helpers shared (low-priority refactor, no behaviour risk)
- **6.6** — Eligibility function names made domain-explicit (low-priority refactor)
- **9.4–9.7** — Future module designs (Safety, Security, Events, Policy Middleware)

**Next action:** Begin CMM Phase 4 Sprint 0. Kickoff: domain schema (Prisma), seed data (categories + priorities), API skeleton for complaint creation and listing. Reference: `vault/CMM/cmm-vision.md`, `AGENTS.md` §10.