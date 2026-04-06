# PrismApp Execution Status

Status: In Progress
Date: 2026-04-06
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
3. Cross-linking between master-data modules and contribution capture is not complete yet.

### Objective 3: Keep architecture ready for Safety, Security, Events, and AI features without rework
Status: Partially complete by architecture, not by feature implementation

Completed:
1. Modular monolith structure is already in place.
2. Domain logic is server-side and organized by module.
3. App Router structure is being aligned toward shell-based module expansion.
4. Vault already contains future-module references and delivery guidance.

Not yet complete:
1. Shared policy middleware is not implemented as a reusable feature foundation yet.
2. Shared audit middleware is not fully implemented yet.
3. Feature flags and extensibility hooks for future modules are not formalized yet.
4. Auth alignment and audit foundations still need to be completed before future modules can be added cleanly.

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
4. Ownership timeline screen implemented with filters, pagination, create plus transfer flow, lightweight lookup loading, and immutable history behavior.
5. Residency timeline screen implemented with filters, pagination, lightweight lookup loading, create flow, and constrained end-date edit behavior.
6. Contribution periods screen implemented as a read-only seeded reference view with year and month filters.
7. Contribution heads screen implemented with search, pagination, and CRUD actions.
8. Contribution rates screen implemented with head and active-date filters plus controlled retirement of current rates.
9. Master-data shell navigation and route metadata were added for blocks, units, individuals, ownerships, residencies, contribution periods, contribution heads, and contribution rates.
10. Dashboard home cards now link to ownership, residency, and contribution master-data workflows.
11. Read-only individuals view now masks email and mobile in the UI.
12. Gender types now have a dedicated read endpoint for the individuals form.
13. Units and individuals now expose lightweight lookup endpoints so timeline dropdowns do not wait on paged browse APIs.

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

### Week 2 Validation and Release Readiness
1. Lint passed during Week 2 sign-off.
2. Build passed during Week 2 sign-off.
3. API regression suites passed during Week 2 sign-off.
4. UAT checklist and release-readiness docs were added.

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
3. Add cross-linking between units, individuals, timeline screens, and contribution capture.

## Activities Yet To Be Performed

### Auth and Shell Follow-Through
1. Complete the remaining auth feedback surfaces across login, redirect, and protected-route states.
2. Remove any remaining test-style auth assumptions from operator-facing flows while preserving payer-versus-operator separation in contribution capture.

### Week 5: Master Data UI Baseline
1. Add cross-linking between units, owners, residents, and contribution flows.
2. Complete any remaining browse-page sort coverage and normalize control placement across module screens.
3. Finish timeline UX hardening around ownership continuity, residency end-date maintenance, and rate-history messaging.
4. Decide whether contribution periods stay reference-only or gain linked drill-through usage.

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
1. Add audit logging for mutation flows.
2. Add observability baseline.
3. Add request tracing or structured request correlation.
4. Review performance-sensitive report queries and indexes.
5. Resolve current PostgreSQL SSL warning semantics in `DATABASE_URL` handling.
6. Prepare for maker-checker extension hooks in corrections.

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