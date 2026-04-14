# Week 6 — Lookup Cache Hardening

Status: Passed
Date: 2026-04-14
Owner: Engineering

## What Changed
Hotspot 1 from Week 6 hardening: centralized the client-side lookup cache invalidation in `src/lib/master-data-lookups.ts`.

### Refactoring
1. Added `LOOKUP_KEYS` constant as a single source of truth for all cache key strings.
2. Added `invalidateLookups(...keys)` — one shared function that clears memory cache, inflight requests, and sessionStorage for any combination of keys.
3. Replaced three hand-rolled per-key invalidation functions (`invalidateUnitLookups`, `invalidateIndividualLookups`, `invalidateOwnershipDependentLookups`) with thin semantic wrappers delegating to the shared core.
4. Added three new semantic wrappers: `invalidateBlockDependentLookups`, `invalidateContributionHeadLookups`, `invalidateResidencyDependentLookups`.

### Gap Fixes
Before this change, three mutation pages did not invalidate affected caches after successful writes:

| Page | Mutations Covered | Invalidation Added |
|------|-------------------|--------------------|
| Blocks | create, update, delete | `invalidateBlockDependentLookups()` — clears unit cache since unit labels include block descriptions |
| Contribution Heads | create, update, delete | `invalidateContributionHeadLookups()` — clears head lookup cache used by rates, capture, and reports |
| Residencies | create, edit end-date | `invalidateResidencyDependentLookups()` — clears resident-eligible unit lists |

Pages already wired before this change: Units, Individuals, Ownerships.
Pages with no cached lookups (no action needed): Contribution Rates, Contribution Periods, Contributions.

## Operator Smoke Test
Date: 2026-04-14
Tester: Manual (operator)

### Scenario: Contribution Head Freshness Across Pages
1. Created a new contribution head: **Flying Club**, per person, monthly.
2. Created a contribution rate of **Rs 5000** for Flying Club.
   - The new head appeared immediately in the rate-creation head dropdown — no hard refresh needed.
3. Navigated to Contribution Capture.
   - Flying Club appeared immediately in the contribution head dropdown.
4. Captured a Flying Club contribution from a resident of unit **Ashok 1507**.
   - Contribution recorded successfully.
5. Opened Transactions Report.
   - The new Flying Club transaction appeared in the transaction list.
6. Opened Paid/Unpaid Matrix.
   - The new contribution was reflected in the matrix.

**Result: Passed** — newly created contribution head propagated through rates, capture, and reporting without any stale-cache issues.

## Validation
- `npm run lint`: Passed
- `npm run build`: Passed
