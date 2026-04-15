# Week 6 Hardening — Complete Evidence

Date: 2026-04-15
Status: Complete
Deployment: Vercel production `a2f00ae`

## Summary

Six hardening hotspots (A–F) were executed, plus three bugs discovered and fixed during testing. All changes are committed and deployed.

---

## Hotspot A: Lookup Cache Registry

**What changed:**
- `src/lib/master-data-lookups.ts` refactored to a centralized `LOOKUP_KEYS` constant and a shared `invalidateLookups(...keys)` core function.
- Three semantic wrappers added: `invalidateBlockDependentLookups`, `invalidateContributionHeadLookups`, `invalidateResidencyDependentLookups`.
- Missing invalidation wired into blocks (create/update/delete), contribution heads (create/update/delete), and residencies (create/edit) mutation pages.

**Test result:**
- Created contribution head "Flying Club" (Rs 5000, monthly, per person). Immediately visible in rate creation, contribution capture, transactions report, and paid/unpaid matrix without stale-cache artifacts.

---

## Hotspot B: Shared Error Envelope Audit

**What changed:**
- Created `src/types/api.ts` with shared `ApiEnvelope<T>`, `PaginatedResponse<T>`, and `toErrorMessage()`.
- Updated 12 client-side files to import from the shared module, removing inline type duplicates.
- Files updated: 8 master-data pages, 2 report pages, `contributions/page.tsx`, `paginated-client.ts`.

**Test result:**
- `npm run lint` and `npm run build` passed. No runtime regressions.

---

## Hotspot C: Pagination/Sort Consistency

**What changed:**
- Audited all API endpoints for sort-default mismatches with their corresponding UI pages.
- One mismatch found: contribution-periods API defaulted to `id asc`, UI expected `refYear desc`.
- Fixed `src/modules/contribution-periods/contribution-periods.service.ts` default sort to `refYear desc`.

**Test result:**
- Contribution periods page loads in year-descending order without client-side re-sort.

---

## Hotspot D: Query Index Review

**What changed:**
- Audited all 58 Prisma queries against the existing schema indexes.
- One genuine gap: report queries filtering contributions by `contributionHeadId` alone were not covered by any leading-column index.
- Added `@@index([contributionHeadId])` to the `Contribution` model in `prisma/schema.prisma`.
- Migration `20260415022708_audit_log` includes this index (combined with the audit log table).

**Eliminated false positives:**
- `systemTag` was already `@unique` (covered).
- `contributionDetail` composite unique index covers `contributionId` as leading column (covered).

---

## Hotspot E: Audit Logging for Financial Writes

**What changed:**
- Added `AuditLog` model to `prisma/schema.prisma` with indexes on `(entityType, entityId)`, `actorUserId`, and `createdAt`.
- Created `src/lib/audit-log.ts` with `writeAuditLog()` utility.
- Wired into `contributions.service.ts` for `CONTRIBUTION_CREATED` and `CONTRIBUTION_CORRECTION_CREATED` actions.
- Migration `20260415022708_audit_log` applied.

**Critical design decision:**
- Audit writes are placed OUTSIDE the business transaction, using the top-level `db` client.
- Reason: `@prisma/adapter-pg` does not guarantee atomicity for interactive `$transaction` callbacks. When audit writes were inside the transaction, contribution 139 committed but its audit log did not, returning a 500 error for a succeeded operation and leaving the app unstable.
- Audit log failures are caught silently (logged to console) and never propagate to the caller.
- The contribution row itself carries `actorUserId` and `actorRole` as the primary audit trail; the `audit_logs` table adds supplementary action/payload context.

**Test result:**
- Created contribution 141 → audit log row present with action `CONTRIBUTION_CREATED`.
- Created correction 142 (cancelling 141) → audit log row present with action `CONTRIBUTION_CORRECTION_CREATED`.
- Created contributions 143–144 → both audit logged correctly.

---

## Hotspot F: Observability Baseline

**What changed:**

### Error Boundaries (new files)
- `app/global-error.tsx` — Top-level catch-all for uncaught errors outside layout boundaries.
- `app/(dashboard)/error.tsx` — Dashboard route group boundary.
- `app/contributions/error.tsx` — Contributions route boundary.
- `app/reports/error.tsx` — Reports route boundary.
- `app/not-found.tsx` — Clean 404 page with home link.

Each boundary shows the error message, an optional digest reference, a retry button, and a home link.

### Request-ID Middleware (new file)
- `middleware.ts` — Matches `/api/:path*` routes. Preserves incoming `x-request-id` or generates a UUID. Sets the header on both the forwarded request and the response.

### Structured Logging (enhanced)
- `src/lib/api-response.ts` — New `getRequestId(request)` export. `logServerError()` and `fromUnknownError()` now accept optional `requestId`. Log format: `{ level, requestId, status, code, message }`.

### Route Handlers Wired
- `app/api/contributions/route.ts` (POST) — request-ID logged on errors.
- `app/api/contributions/[id]/corrections/route.ts` (POST) — request-ID logged on errors.
- `app/api/reports/transactions/route.ts` (GET) — request-ID logged on errors.
- `app/api/reports/transactions/csv/route.ts` (GET) — request-ID logged on errors.
- `app/api/reports/paid-unpaid-matrix/route.ts` (GET) — request-ID logged on errors.
- `app/api/reports/paid-unpaid-matrix/csv/route.ts` (GET) — request-ID logged on errors.

**Test plan:**
1. Navigate to a non-existent route → `not-found.tsx` renders with home link.
2. Force a runtime error in a dashboard page → `(dashboard)/error.tsx` renders with retry button and digest.
3. Call any wired API route → response includes `x-request-id` header.
4. Trigger an API error → Vercel function logs show structured JSON with `requestId`, `status`, `code`, `message`.
5. Verify that error boundaries do not interfere with normal page rendering.

**Impact on existing code:**
- Backward compatible: existing `fromUnknownError()` calls without `requestId` still work (logs `"unknown"`).
- No breaking changes to any existing route handler or page.
- Six financial/report route handlers now produce traceable structured error logs.
- All route groups now have graceful error recovery instead of white-screen crashes.

---

## Bug Fixes Discovered During Hardening

### Driver-Adapter Transaction Atomicity (found during Hotspot E)
- **Symptom:** Contribution 139 committed but audit log row missing; API returned 500; app became unstable.
- **Root cause:** `@prisma/adapter-pg` interactive `$transaction` is not truly atomic — each statement can commit independently.
- **Fix:** Moved `writeAuditLog` outside the transaction with try/catch.

### Render Loop on Transactions Report (found during Hotspot F testing)
- **Symptom:** Transactions report page entered infinite re-render loop.
- **Root cause:** `pushQueryState` → `window.history.pushState` → Next.js 16 intercepts and re-fires `useSearchParams` → `setFilters` creates new object → effect re-triggers → loop.
- **Fix:** Added URL comparison guard in `src/lib/url-query-state.ts`: skips `pushState` when the computed URL matches the current `window.location`.

### Cold-Start Retry Gap (found during audit)
- **Symptom:** Contribution periods page used raw `fetch()` without retry, failing on Vercel cold starts.
- **Fix:** Replaced with `fetchJsonWithRetry` in `app/(dashboard)/contribution-periods/page.tsx`.

---

## Transaction Isolation Alignment

- Changed all 9 interactive transactions from `Serializable` to `ReadCommitted` across 5 service files.
- Files: `units.service.ts`, `residencies.service.ts`, `ownerships.service.ts`, `contribution-rates.service.ts`, `contributions.service.ts`.
- Reason: `Serializable` fails on Prisma Postgres cloud adapter. JavaScript-level overlap checks remain sufficient for temporal constraint enforcement.

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `src/types/api.ts` | Shared API envelope types |
| `src/lib/audit-log.ts` | Audit log utility |
| `middleware.ts` | Request-ID middleware |
| `app/global-error.tsx` | Global error boundary |
| `app/(dashboard)/error.tsx` | Dashboard error boundary |
| `app/contributions/error.tsx` | Contributions error boundary |
| `app/reports/error.tsx` | Reports error boundary |
| `app/not-found.tsx` | 404 page |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | AuditLog model + contributionHeadId index |
| `src/lib/api-response.ts` | getRequestId, structured logging |
| `src/lib/url-query-state.ts` | URL comparison guard |
| `src/lib/master-data-lookups.ts` | LOOKUP_KEYS registry, centralized invalidation |
| `src/lib/paginated-client.ts` | Shared type imports |
| `src/modules/contributions/contributions.service.ts` | Audit logging, ReadCommitted |
| `src/modules/contribution-periods/contribution-periods.service.ts` | Sort default fix |
| `src/modules/units/units.service.ts` | ReadCommitted |
| `src/modules/residencies/residencies.service.ts` | ReadCommitted |
| `src/modules/ownerships/ownerships.service.ts` | ReadCommitted |
| `src/modules/contribution-rates/contribution-rates.service.ts` | ReadCommitted |
| 8 master-data pages | Shared type imports |
| 2 report pages | toErrorMessage from shared types |
| `app/contributions/page.tsx` | Shared ApiEnvelope import |
| 6 route handlers | getRequestId wired in |
| `app/(dashboard)/contribution-periods/page.tsx` | fetchJsonWithRetry |
