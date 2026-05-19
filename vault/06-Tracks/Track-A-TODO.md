# Track-A TODO — Production-Grade App

**Goal:** Get PrismApp as close to production-grade as possible as a solo developer.
**Date:** 2026-04-24
**Scope:** V1 modules only (blocks, units, individuals, ownerships, residencies, contributions, reports).

Items are grouped by theme and sequenced from highest to lowest value. Each item is marked:
- ✅ Done
- 🔄 In progress
- ⬜ Not started

---

## 1. Domain Correctness

Items that would cause silent data errors if left unresolved.

| #   | Item                                                           | Status | Notes                                                                                                                                               |
| --- | -------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | Ownership overlap prevented per unit                           | ✅      | Enforced in `createOwnership` and `transferOwnership`                                                                                               |
| 1.2 | Residency overlap prevented per unit                           | ✅      | Enforced in `createResidency`                                                                                                                       |
| 1.3 | Ownership continuity enforced (no gap from `inceptionDt`)      | ✅      | Builder inventory bootstrap fills gaps                                                                                                              |
| 1.4 | Residency creation rejects system identities and unowned units | ✅      | Eligible-unit list enforces this                                                                                                                    |
| 1.5 | Contribution duplicate prevention (unit + head + period)       | ✅      | Enforced in `createContribution`                                                                                                                    |
| 1.6 | Rate locked at contribution time (immutable snapshot)          | ✅      | `rateAmt`, `ratePeriod`, `ratePayUnit` persisted                                                                                                    |
| 1.7 | Financial corrections use compensating transactions only       | ✅      | `createContributionCorrection` with original linkage                                                                                                |
| 1.8 | Unit `sqFt` locked after any per-sq-ft contribution            | ✅      | `updateUnit` checks `Contribution` for per-sq-ft head                                                                                               |
| 1.9 | Rate-period coverage policy decision                           | ✅      | **Warn** option implemented. `checkRatePeriodCoverage()` in `contributions.service.ts` compares the applicable rate's `fromDt` against the earliest selected period's start date. When the rate started after the period, a human-readable warning string is returned in `createContribution`'s response (`{ contribution, warning }`). Accepted policy: rate is always resolved at `transactionDateTime` (not period start); operator is notified when a mismatch occurs. No blocking guard — just a surfaced warning. |

---

## 2. Security and Authorization

Items that protect data and operator accountability.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Route-level auth guards on all protected APIs | ✅ | `requireReadRole` and `requireMutationRole` on all routes |
| 2.2 | Role-based access: SOCIETY_ADMIN, MANAGER, READ_ONLY | ✅ | Mapped from JWT session |
| 2.3 | PII masking: email and mobile masked for READ_ONLY role | ✅ | `maskIndividualPii` applied in `listIndividuals` and `getIndividualById` |
| 2.4 | Auth.js credentials login baseline | ✅ | JWT-backed session, seeded app users |
| 2.5 | Auth feedback on protected redirect (401 vs 403) | ✅ | Public entry and home page show explicit feedback |
| 2.6 | OAuth Phase 2 (Google / Microsoft account linking) | ✅ | Email-matching strategy — `AppUser` must pre-exist with the OAuth provider email (no new DB table or schema change). `enabledOAuthProviders` export from `auth.ts` controls which buttons render (conditional on `GOOGLE_CLIENT_ID/SECRET` and `AZURE_AD_CLIENT_ID/SECRET` env vars). `signIn` callback gates OAuth against `AppUser.isActive`; inactive or missing → `/?auth=oauth-denied` (danger banner). `jwt` callback is now `async` and distinguishes credentials vs OAuth via `account?.provider` to load role/displayName from `AppUser`. Providers: `GoogleProvider` + `AzureADProvider` from `next-auth/providers/*` (no new npm deps). Credentials login remains a standalone fallback when OAuth env vars are absent. `.env.example` updated with commented OAuth variable stubs. |
| 2.7 | OWASP Top 10 gap review for internal operator app | ✅ | Formal pass completed 2026-05-11. Findings in `vault/00-Core/OWASP-Top10-Gap-Review.md`. A03/A08/A10 fully clear. A05: HTTP security headers added to `next.config.ts` (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy). A06: `npm audit fix` run; Next.js upgraded 16.2.0 → 16.2.6 (DoS patch GHSA-q4gf-8mx6-v5v3); 6 moderate transitive vulns remain via `@prisma/dev` (dev-only CLI, not shipped). Open: rate limiting (8.9), error tracker (4.6), bcrypt cost-factor review (advisory). |
| 2.8 | Uniform auth feedback on every protected shell route | ✅ | Server-side `layout.tsx` guards added for all SOCIETY_ADMIN-only routes: `/app-users`, `/audit-log`, `/contributions/corrections`. Each calls `requireServerAppSession({ allowedRoles: ["SOCIETY_ADMIN"] })` and redirects to `/home?auth=denied&from=<name>`. Home page already renders `InlineNotice` for `auth=denied`. Unauthenticated access redirects to `/?auth=required` with banner. Contribution capture (`/contributions`) already had `allowedRoles: ["SOCIETY_ADMIN","MANAGER"]`. |
| 2.9 | Contribution posting actor identity: `depositedBy` references real individual | ✅ | System identities rejected as depositors |
| 2.10 | `actorUserId` and `actorRole` captured in all mutations | ✅ | All 14 mutating route handlers now pass `actor` to service layer |

---

## 3. Audit and Immutability

Items that make the system auditable and safe for financial records.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | `AuditLog` model with indexes | ✅ | Migration `20260415022708_audit_log` applied |
| 3.2 | `writeAuditLog()` utility (fire-and-forget, failures non-propagating) | ✅ | `src/lib/audit-log.ts` |
| 3.3 | Audit logging on contribution creation and correction | ✅ | Wired in `contributions.service.ts` |
| 3.4 | Audit logging on all master-data mutations | ✅ | Blocks, units, individuals, contribution heads, rates, ownerships, residencies all wired |
| 3.5 | In-place edit/delete of posted contributions blocked | ✅ | Domain rule enforced server-side |
| 3.6 | Audit log reader / admin view | ✅      | `GET /api/audit-log` (SOCIETY_ADMIN only). Service in `src/modules/audit-log/audit-log.service.ts`. Filters: action, entityType, actorUserId. Paginated, sorted newest-first. UI at `app/(dashboard)/audit-log/page.tsx` with DataTable, expandable payload cells, filter dropdowns. Nav item added (SOCIETY_ADMIN role only). `requireAdminRole()` helper added to `src/lib/authz.ts`. |
| 3.7 | Maker-checker extension hooks for correction approval | ✅ | Schema fields added. `MAKER_CHECKER_ENABLED` flag in service (default `false`; flip to activate). `listPendingCorrections()`, `approveCorrection()`, `rejectCorrection()` service functions built. API routes: `GET /api/contributions/corrections/pending`, `POST /api/contributions/corrections/[id]/approve`, `POST /api/contributions/corrections/[id]/reject` — all SOCIETY_ADMIN only. UI at `/contributions/corrections` with per-card approve/reject flow, self-submission guard (maker ≠ checker enforced), rejection reason required. Nav entry added for SOCIETY_ADMIN. |

---

## 4. Observability and Error Handling

Items that make production failures diagnosable.

| #   | Item                                                               | Status | Notes                                                     |
| --- | ------------------------------------------------------------------ | ------ | --------------------------------------------------------- |
| 4.1 | Request-ID middleware on all `/api/*` routes                       | ✅      | UUID generated and propagated via `x-request-id`          |
| 4.2 | Request-ID wired into all 33 route handler catch blocks            | ✅      | `getRequestId()` used uniformly                           |
| 4.3 | Structured JSON error logging on `500`-class failures              | ✅      | `api-response.ts` logs to server console                  |
| 4.4 | React error boundaries (global, dashboard, contributions, reports) | ✅      | `global-error.tsx` and three route-group boundaries       |
| 4.5 | Clean 404 page                                                     | ✅      | `app/not-found.tsx`                                       |
| 4.6 | Error tracking integration (Sentry or equivalent)                  | ✅      | `@sentry/nextjs@10.53.1` installed. `instrumentation-client.ts` initializes Sentry in browser. `sentry.server.config.ts` + `sentry.edge.config.ts` for server/edge runtimes. `instrumentation.ts` registers server/edge and exports `onRequestError = Sentry.captureRequestError`. `next.config.ts` wrapped with `withSentryConfig`. `global-error.tsx` calls `Sentry.captureException`. DSN in `NEXT_PUBLIC_SENTRY_DSN` env var. Verified working on Vercel production (2026-05-18) — test error appeared in Sentry Issues within 30 seconds. Source map upload requires `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in Vercel build env (skipped gracefully if absent). |
| 4.7 | Uptime / health-check endpoint                                     | ✅      | `GET /api/health` — public, no auth. Runs `SELECT 1` to verify DB reachability. Returns `200 { status:"ok", timestamp, db:"ok" }` on success; `503 { status:"degraded", db:"unreachable", detail }` on DB failure. `app/api/health/route.ts`. |
| 4.8 | Retry on transient failures (client-side)                          | ✅      | `fetchJsonWithRetry` used on all protected reads          |

---

## 5. Performance

Items that affect operator experience at realistic data volumes.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | Query indexes on `Contribution` for report filters | ✅ | `@@index([contributionHeadId])` added; ERD index review completed |
| 5.2 | `AuditLog` indexes on `(entityType, entityId)`, `actorUserId`, `createdAt` | ✅ | In schema and migration |
| 5.3 | Paid/unpaid matrix batching (no per-unit query loops) | ✅ | Batch refactored during Week 2 hardening |
| 5.4 | Lookup cache with centralized invalidation registry | ✅ | `LOOKUP_KEYS` registry + `invalidateLookups()` in place |
| 5.5 | Dashboard shell prewarms common lookups on sign-in | ✅ | Reduces first dropdown open latency |
| 5.6 | `/api/units/lookups` returns `blockId` without `include: { block: true }` | ✅ | Fixed: `listUnitLookups()` now returns only `{id, description, blockId}` (no join). `loadUnitLookupsCached()` fetches blocks separately via `/api/blocks/lookups` (3 rows, cached) and enriches units client-side. `getRequestId` regression in `api-response.ts` also fixed as part of this pass. |
| 5.7 | Pagination enforced on all list endpoints | ✅ | `pageSize` capped at 100 across all browse APIs |
| 5.8 | Contribution transactions CSV export unbounded (no 100-row cap) | ✅ | Fixed in CSV metadata enrichment |

---

## 6. Code Maintainability

Items that prevent future breakage when adding modules.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Shared `ApiEnvelope<T>`, `PaginatedResponse<T>`, `toErrorMessage()` types | ✅ | `src/types/api.ts`; 12 client files updated |
| 6.2 | Shared table / filter bar / form shell components extracted | ✅ | `DataTable`, `BrowseFilterBar`, `NoticeStack`, `useBrowseState`, `useCrudActions` |
| 6.3 | Lookup cache invalidation centralized | ✅ | `invalidateLookups()` core with semantic wrappers |
| 6.4 | Ownership transfer decomposed into focused policy steps | ✅      | Refactor Hotspot 2. Extracted 6 named helpers from `transferOwnership` in `ownerships.service.ts`: `loadScheduledOwnershipRows`, `classifyFutureOwnershipRows`, `repairRedundantBuilderRows`, `loadActiveOwnershipAtDate`, `validateTransferDateAgainstCurrentOwner`, `applyOwnershipTransfer`. Pure structural refactor — no behavior change. |
| 6.5 | Timeline overlap helpers shared between ownerships and residencies | ⬜ | Refactor Hotspot 3. Low priority until a third timeline entity appears. |
| 6.6 | Eligibility function names made domain-explicit | ⬜ | Refactor Hotspot 4. `listResidencyEligibleUnitIds` → `listUnitsEligibleForResidencyCreation()` etc. |
| 6.7 | `ReadCommitted` isolation on all interactive transactions | ✅ | All 9 transactions aligned |
| 6.8 | Audit writes placed outside `$transaction` (driver-adapter limitation documented) | ✅ | ADR-001 extended; risk note in sprint board |

---

## 7. Testing

Items that give confidence before and after each change.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | API regression scripts for contributions, timelines, reports | ✅ | `scripts/test-*.mjs` |
| 7.2 | Ownership-residency regression matrix documented | ✅ | `Ownership-Residency-Regression-Matrix.md` |
| 7.3 | Regression scripts runnable on clean seed data | ✅ | All `scripts/test-*.mjs` create their own data using `Date.now()` uniqueness stamps and clean up after themselves. `test-api-error-mapping.mjs` is pure in-memory. The only seed dependency is seeded contribution periods (current year) and seeded app users — both provided by `prisma db seed`. `test:api:*` npm scripts already present in `package.json`. Folded into 7.5. |
| 7.4 | Vitest unit tests for domain service layer | ✅ | Vitest v4.1.5 + @vitest/coverage-v8 installed. `vitest.config.ts` configured. 3 test files, 69 tests: `contributions.helpers.test.ts` (33), `contributions.schemas.test.ts` (17), `ownerships.schemas.test.ts` (19). Pure helpers extracted to `contributions.helpers.ts`. All tests pass; lint and build clean. |
| 7.5 | Automated test run in CI (GitHub Actions or Vercel check) | ✅ | `.github/workflows/ci.yml` added. Runs on push and PR to master/main: `npm ci` → `npm run lint` → `npm test` (Vitest, no DB needed) → `npm run build` (dummy `DATABASE_URL` satisfies module-level guard; Prisma client connects lazily) → `npm audit --audit-level=high`. API integration scripts (`test:api:*`) remain manual pre-deploy checks — they require a live DB and running server. |
| 7.6 | Temporal edge case coverage: rate-period mismatch, overlap boundary, inception gap | ✅ | Pure temporal helpers extracted and tested. `checkRatePeriodCoverage` moved to `contributions.helpers.ts` (10 tests). `rangesOverlap`, `addDays`, `ensureNotBeforeUnitInception` extracted to `ownerships.helpers.ts` (23 tests) and `residencies.helpers.ts` (11 tests). Total test count: 69 → 113. All passing. |

---

## 8. Deployment and Operations

Items required for a real production deployment.

| #   | Item                                                                       | Status | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 8.1 | Vercel preview deployment active                                           | ✅      | Preview branches deploy automatically                                                                                                                                                                                                                                                                                                                                    |
| 8.2 | PostgreSQL in production (Vercel Postgres or Neon)                         | ✅      | Connected and seeded                                                                                                                                                                                                                                                                                                                                                     |
| 8.3 | `prisma migrate deploy` runs cleanly on empty DB                           | ✅      | Tested                                                                                                                                                                                                                                                                                                                                                                   |
| 8.4 | `prisma db seed` reproducible and idempotent                               | ✅      | Builder ownership deduplication in place                                                                                                                                                                                                                                                                                                                                 |
| 8.5 | `DATABASE_URL` SSL semantics resolved                                      | ✅      | Added `withVerifyFullSsl()` to `src/lib/db.ts` (commit `ecc765d`) — rewrites `sslmode=require\|prefer\|verify-ca` → `sslmode=verify-full` at runtime to preserve strong-TLS semantics and silence the `pg-connection-string` v3 deprecation warning. No env file changes required. Vercel Prisma Postgres enforces TLS server-side regardless. When connection pooling is needed, swap `DATABASE_URL` on Vercel to the Prisma Accelerate URL (`prisma+postgres://accelerate.prisma-data.net/...`). |
| 8.6 | Database backup policy                                                     | ✅      | **Provider**: Vercel Postgres (Neon-backed) provides automatic daily backups with 7-day PITR on free tier, 30-day on Pro — no configuration required from the app. **Manual backups**: `scripts/backup-db.mjs` — `pg_dump` wrapper that reads `DATABASE_URL` from `.env`, writes a plain-SQL dump to `backups/prismapp-<timestamp>.sql`. Run via `npm run backup:db`. `backups/` is git-ignored (contains real data). Restore: `psql "$DATABASE_URL" < backups/<file>.sql`. Requires PostgreSQL client tools (`pg_dump`) in PATH. **Policy**: run before every schema migration and after each production data-load. |
| 8.7 | Environment variable hygiene (no secrets in repo, `.env.example` complete) | ✅      | `.env.example` present; secrets in Vercel env                                                                                                                                                                                                                                                                                                                            |
| 8.8 | Production sign-in with real user accounts (not seed demo users)           | ✅      | App Users management screen added at `/app-users` (SOCIETY_ADMIN only). `GET/POST /api/app-users` and `GET/PATCH /api/app-users/[id]` route handlers. Service in `src/modules/app-users/app-users.service.ts` with `bcrypt` cost factor 12. `parseCreateAppUserInput` validates email format, password min 10 chars, valid role. Admins can create accounts, change display name, role, active flag, and reset passwords. Audit log entries written for `APP_USER_CREATED` and `APP_USER_UPDATED`. Seed demo users remain for dev/staging; production admin creates real accounts via this screen then disables or removes demo users. |
| 8.9 | Rate limiting on auth endpoints                                            | ✅      | In-memory rate limiter added to `proxy.ts` (Next.js 16 proxy/middleware). Limits `POST /api/auth/callback/credentials` to 5 attempts per IP per 15 min; returns `429` with `Retry-After`. Closes OWASP A05-GAP-2 + A07-GAP-1. Also confirms `x-request-id` propagation now active (proxy was correctly named all along; Next.js 16 uses `proxy.ts` not `middleware.ts`). |

---

## 9. Future Modules (Design-Ready, Not Built)

Items that keep V1 architecture extensible without rework.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | Modular monolith folder structure (`src/modules/<domain>/`) | ✅ | All domains follow the same pattern |
| 9.2 | Shared auth guard reusable by new modules | ✅ | `requireReadRole` / `requireMutationRole` in `src/lib/authz.ts` |
| 9.3 | Shared audit log reusable by new modules | ✅ | `writeAuditLog()` is domain-agnostic |
| 9.4 | Safety module design | ⬜ | Deferred. ADR or design note not yet started. |
| 9.5 | Security incidents module design | ⬜ | Deferred. |
| 9.6 | Events and common-space bookings module design | ⬜ | Deferred. |
| 9.7 | Shared policy middleware reusable across future modules | ⬜ | Not formalized yet. Current auth guards work but are not a general middleware pattern. |

---

## Summary

| Theme | Done | In Progress | Not Started |
|-------|------|-------------|-------------|
| 1. Domain Correctness | 9 | 0 | 0 |
| 2. Security and Authorization | 9 | 0 | 1 |
| 3. Audit and Immutability | 5 | 1 | 1 |
| 4. Observability and Error Handling | 8 | 0 | 0 |
| 5. Performance | 8 | 0 | 0 |
| 6. Code Maintainability | 5 | 0 | 3 |
| 7. Testing | 6 | 0 | 0 |
| 8. Deployment and Operations | 8 | 0 | 0 |
| 9. Future Modules | 3 | 0 | 4 |
| **Total** | **62** | **0** | **11** |

### Highest-Value Open Items (Ordered)

1. **6.5** — Timeline overlap helpers shared between ownerships and residencies
