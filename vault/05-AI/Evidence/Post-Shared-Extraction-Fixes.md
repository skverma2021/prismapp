# Post-Shared-Extraction Fixes — Evidence

Date: 2026-04-16
Status: Complete

## Summary

Three issues addressed after the shared table/filter/form extraction was completed across all 8 master-data browse pages. Two were bugs discovered during operator smoke testing; one was a Next.js 16 deprecation.

---

## Fix 1: Next.js 16 Proxy Convention Rename

**Symptom:** Console deprecation warning on every request: `⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.`

**Root cause:** Next.js 16 renamed the middleware convention to "proxy".

**Change:**
- Renamed `middleware.ts` → `proxy.ts` at project root.
- Renamed exported function `middleware` → `proxy`.
- No other changes required; `config.matcher` stayed the same.

**File:** `proxy.ts`

**Test result:** Build clean, deprecation warning gone.

---

## Fix 2: URL Filter Initialization on Browse Pages

**Symptom:** Navigating from a parent page (e.g., Blocks → Units with `?blockId=X`) showed an unfiltered list on initial load. The Apply Filters button also did not work; a manual Reset was required before filters became functional.

**Root cause:** `useBrowseState` (the shared hook used by all 8 browse pages) initialized filter and sort state with `buildDefaultFilterRecord` (empty defaults) instead of reading the URL search params. This caused two problems:
1. Filters were initialized empty even when the URL carried filter values.
2. A race condition: the first (unfiltered) data fetch could overwrite results from a second (URL-filtered) fetch that resolved faster.

**Changes in `src/hooks/use-browse-state.ts`:**
1. Filter state initialization changed from `useState(buildDefaultFilterRecord)` to `useState(buildFilterRecord)` which reads current URL params via `useSearchParams()`.
2. Sort state initialization changed from static defaults to lazy initializers that read `searchParams.get("sortBy")` and `searchParams.get("sortDir")`.
3. Added `let stale = false` flag in the data-loading effect with cleanup `return () => { stale = true; }`. All `setState` calls after the async fetch are guarded by `if (stale) return`, preventing a superseded fetch from overwriting current results.

**Affected pages:** All 8 master-data browse pages (blocks, units, individuals, contribution-heads, contribution-periods, contribution-rates, ownerships, residencies).

**Test result:** Navigating from Blocks to Units with `?blockId=X` now shows the filtered list immediately on first render. Apply Filters and Reset both work correctly. Build clean.

---

## Fix 3: Duplicate Contribution Cancellation Prevention

**Symptom:** Operator was able to cancel contribution #145 multiple times, creating corrections #146, #147, and #148 — all pointing to the same original. Only the first correction (#146) was valid; #147 and #148 were orphaned compensating rows.

**Root cause:** `createContributionCorrection` in `contributions.service.ts` checked whether the target was itself a correction (preventing correction-of-correction), but never checked whether the original already had an existing correction.

**Change in `src/modules/contributions/contributions.service.ts`:**
- Added a `findFirst` query inside the serializable transaction, after the existing correction-of-correction guard:
  ```
  const existingCorrection = await tx.contribution.findFirst({
    where: { correctionOfContributionId: original.id },
    select: { id: true },
  });
  ```
- If found, throws `HttpError(409, "CONFLICT", "This contribution has already been cancelled/corrected (correction #${existingCorrection.id}). No further corrections allowed.")`.

**Cleanup:** Orphaned rows #147 and #148 were manually deleted by the operator.

**Test result:** Attempting to cancel an already-cancelled contribution now returns a 409 CONFLICT error with a clear message referencing the existing correction ID. Build clean.

---

## Impact Assessment

| Fix | Scope | Risk |
|-----|-------|------|
| Proxy rename | Infra / build warning | None — backward compatible |
| URL filter init | All 8 browse pages via shared hook | Low — additive guard, no behavior change for non-linked navigation |
| Duplicate cancellation | Financial mutation path | Medium — prevents data corruption; existing valid corrections unaffected |
