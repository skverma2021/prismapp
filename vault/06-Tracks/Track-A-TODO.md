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

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Ownership overlap prevented per unit | ✅ | Enforced in `createOwnership` and `transferOwnership` |
| 1.2 | Residency overlap prevented per unit | ✅ | Enforced in `createResidency` |
| 1.3 | Ownership continuity enforced (no gap from `inceptionDt`) | ✅ | Builder inventory bootstrap fills gaps |
| 1.4 | Residency creation rejects system identities and unowned units | ✅ | Eligible-unit list enforces this |
| 1.5 | Contribution duplicate prevention (unit + head + period) | ✅ | Enforced in `createContribution` |
| 1.6 | Rate locked at contribution time (immutable snapshot) | ✅ | `rateAmt`, `ratePeriod`, `ratePayUnit` persisted |
| 1.7 | Financial corrections use compensating transactions only | ✅ | `createContributionCorrection` with original linkage |
| 1.8 | Unit `sqFt` locked after any per-sq-ft contribution | ✅ | `updateUnit` checks `Contribution` for per-sq-ft head |
| 1.9 | Rate-period coverage policy decision | ⬜ | Current rule allows back-dated contributions against future rates. Options: warn, guard, or document as accepted behavior. See sprint board item 6. |

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
| 2.6 | OAuth Phase 2 (Google / Microsoft account linking) | ⬜ | Deferred. Plan in sprint board Stretch. |
| 2.7 | OWASP Top 10 gap review for internal operator app | ⬜ | Informal review done during development. Formal pass not yet recorded. |
| 2.8 | Uniform auth feedback on every protected shell route | ⬜ | Sprint board item. Some redirect paths still rely on silent redirect only. |
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
| 3.6 | Audit log reader / admin view | ⬜ | No UI to query `AuditLog`. Useful for SOCIETY_ADMIN but not yet built. |
| 3.7 | Maker-checker for correction approval | ⬜ | Deferred. V1 is single-step. Extension points identified in ADR-001. |

---

## 4. Observability and Error Handling

Items that make production failures diagnosable.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | Request-ID middleware on all `/api/*` routes | ✅ | UUID generated and propagated via `x-request-id` |
| 4.2 | Request-ID wired into all 33 route handler catch blocks | ✅ | `getRequestId()` used uniformly |
| 4.3 | Structured JSON error logging on `500`-class failures | ✅ | `api-response.ts` logs to server console |
| 4.4 | React error boundaries (global, dashboard, contributions, reports) | ✅ | `global-error.tsx` and three route-group boundaries |
| 4.5 | Clean 404 page | ✅ | `app/not-found.tsx` |
| 4.6 | Error tracking integration (Sentry or equivalent) | ⬜ | No external error tracker configured. Server logs only. |
| 4.7 | Uptime / health-check endpoint | ⬜ | No `/api/health` route. Useful for Vercel and monitoring. |
| 4.8 | Retry on transient failures (client-side) | ✅ | `fetchJsonWithRetry` used on all protected reads |

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
| 5.6 | `/api/units/lookups` returns `blockId` without `include: { block: true }` | ⬜ | Known regression: 3.1s on ~3,958 units. Fix: return only `id, description, blockId`. Sprint board item 5. |
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
| 6.4 | Ownership transfer decomposed into focused policy steps | ⬜ | Refactor Hotspot 2. Current single-function body is hard to extend safely. |
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
| 7.3 | Regression scripts runnable on clean seed data | ⬜ | Scripts require specific IDs from prior runs. Needs seed-aligned test fixtures. |
| 7.4 | Vitest unit tests for domain service layer | ⬜ | No unit test framework configured. Domain business logic is currently covered only by API-level scripts. |
| 7.5 | Automated test run in CI (GitHub Actions or Vercel check) | ⬜ | No CI pipeline. Lint and build run manually before deploy. |
| 7.6 | Temporal edge case coverage: rate-period mismatch, overlap boundary, inception gap | ⬜ | Partially covered in regression matrix documentation but not yet in executable form. |

---

## 8. Deployment and Operations

Items required for a real production deployment.

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | Vercel preview deployment active | ✅ | Preview branches deploy automatically |
| 8.2 | PostgreSQL in production (Vercel Postgres or Neon) | ✅ | Connected and seeded |
| 8.3 | `prisma migrate deploy` runs cleanly on empty DB | ✅ | Tested |
| 8.4 | `prisma db seed` reproducible and idempotent | ✅ | Builder ownership deduplication in place |
| 8.5 | `DATABASE_URL` SSL semantics resolved | ⬜ | SSL warning present on some environments. Sprint board item 4. |
| 8.6 | Database backup policy | ⬜ | No automated backup configured. Depends on hosting provider. |
| 8.7 | Environment variable hygiene (no secrets in repo, `.env.example` complete) | ✅ | `.env.example` present; secrets in Vercel env |
| 8.8 | Production sign-in with real user accounts (not seed demo users) | ⬜ | Current seed users are demo accounts. Production requires admin-created accounts or OAuth Phase 2. |
| 8.9 | Rate limiting on auth endpoints | ⬜ | No rate limiting on `/api/auth/*`. Relevant for public-facing deployment. |

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
| 1. Domain Correctness | 8 | 0 | 1 |
| 2. Security and Authorization | 7 | 0 | 3 |
| 3. Audit and Immutability | 5 | 0 | 2 |
| 4. Observability and Error Handling | 6 | 0 | 2 |
| 5. Performance | 7 | 0 | 1 |
| 6. Code Maintainability | 4 | 0 | 4 |
| 7. Testing | 2 | 0 | 4 |
| 8. Deployment and Operations | 4 | 0 | 5 |
| 9. Future Modules | 3 | 0 | 4 |
| **Total** | **46** | **0** | **26** |

### Highest-Value Open Items (Ordered)

1. **5.6** — Fix `/api/units/lookups` performance (known 3.1s regression)
2. **7.4** — Configure Vitest and add unit tests for domain service logic
3. **7.3** — Make regression scripts runnable on clean seed data
4. **1.9** — Decide rate-period coverage policy and document or guard
5. **8.5** — Resolve `DATABASE_URL` SSL warning
6. **6.4** — Decompose ownership transfer into focused policy steps
7. **2.7** — Record formal OWASP Top 10 gap review
8. **8.9** — Add rate limiting on auth endpoints before public launch
9. **3.6** — Build an audit log admin view for SOCIETY_ADMIN
10. **7.5** — Set up CI pipeline (lint + build + seed + test on push)
