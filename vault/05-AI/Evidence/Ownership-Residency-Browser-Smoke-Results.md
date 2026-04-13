# Ownership and Residency Browser Smoke Results

Status: Partial Pass with Defects Found
Date: 2026-04-13
Owner: Engineering

## Scope
1. Execute as much of [Ownership-Residency-Browser-Smoke-Checklist.md](Ownership-Residency-Browser-Smoke-Checklist.md) as possible with the current tooling.
2. Separate route-level automated proxy evidence from true browser-interaction validation.

## Result Summary
1. Authenticated route render smoke passed locally for all checklist target screens.
2. Preview browser testing now confirms the main builder inventory to transfer to residency path can succeed end to end.
3. Two residency defects were still observed during preview testing: a generic error on a pre-owner-start attempt and unstable behavior after repeated overlap attempts.
4. The checklist should not be marked fully passed until those defects are resolved and the no-refresh picker behavior is revalidated.

## Automated Proxy Evidence
Environment:
1. Local app started on `http://127.0.0.1:3112`
2. Authenticated session created for `manager@prismapp.local`

Route results:
1. `GET /units` -> `200`
2. `GET /individuals` -> `200`
3. `GET /ownerships` -> `200`
4. `GET /residencies` -> `200`
5. `GET /contributions` -> `200`
6. `GET /contribution-heads` -> `200`
7. `GET /contribution-rates` -> `200`

Interpretation:
1. The authenticated operator routes required by the browser smoke checklist render successfully.
2. No route-level redirect or session-gating issue blocked access during the smoke pass.

## Pending Human Browser Validation
The following checklist items still need a real browser operator pass:
1. Create a new unit and verify builder inventory presentation in Ownerships.
2. Create a new individual and confirm the owner picker updates without browser refresh.
3. Transfer ownership and confirm the unit appears in residency creation without browser refresh.
4. Create a second new individual and confirm the residency picker updates without browser refresh.
5. Create the residency successfully through the UI.
6. Validate cross-screen freshness for Individuals, Units, and Contribution Heads through ordinary in-app navigation.

## Notes
1. Backend and API coverage for the same domain area is already substantially covered by `npm run test:api:timelines` and `npm run test:api:error-mapping`.
2. This artifact is intentionally conservative: it records only what was truly verified with the current tools.

## Preview Browser Observations
Environment:
1. Preview deployment from `preview/ownership-continuity` branch.
2. Manual operator validation reported on 2026-04-13.

Observed sequence:
1. Created unit `Ashok, 1504`.
	- Status: Pass
	- Result: Unit appeared as builder inventory from `2026-01-01`.
2. Created individual `X`.
	- Status: Pass
3. Transferred `Ashok, 1504` ownership to `X` effective `2025-07-01` as reported by operator.
	- Status: Pass from operator perspective
	- Note: The reported year may need confirmation against actual preview data if later diagnosis depends on it.
4. Created individual `Y`.
	- Status: Pass
5. Tried to create residency for `Y` on `Ashok, 1504` effective `2025-06-30`.
	- Status: Fail
	- Result: UI showed `Unexpected server error`.
6. Reloaded Residencies page and retried residency for `Y` effective `2025-07-01`.
	- Status: Pass
	- Result: Residency creation succeeded.
7. Overlap simulation attempt 1: tried to create residency for `X` effective `2025-08-01`.
	- Status: Partial Pass
	- Result: Correct domain message shown: `Residency period overlaps with an existing residency for this unit.`
	- Follow-up: plain page refresh did not restore normal behavior, but navigating to Home and back to Residencies did.
8. Overlap simulation attempt 2: retried the same overlapping residency for `X` effective `2025-08-01`.
	- Status: Fail
	- Result: UI showed `Unexpected server error`.

## Defects Found
1. Residency create on a date before the successful owner-start date produced `Unexpected server error` instead of a stable domain/precondition message.
2. Repeated overlap attempts on Residencies appear to leave the page in an unstable state: first overlap returns the expected conflict message, while a later attempt returns `Unexpected server error`.

## Localhost vs Preview Contrast
1. Localhost overlap simulation was retried twice and behaved correctly each time.
	- Result: overlap attempts continued to return the expected domain conflict message.
2. Vercel preview overlap simulation still produced `Unexpected server error`.
	- Interpretation: the remaining issue appears environment-sensitive rather than a pure residency-rule defect.

## Recommended Follow-Up
1. Reproduce the preview-only residency failures against the latest deployed commit and capture the exact response code and error payload from the network panel.
2. Inspect whether the failing dates were actually `2025-*` or `2026-*`, since the reported years conflict with current unit-inception constraints and could affect root-cause analysis.
3. Re-test overlap handling after any fix to confirm repeated invalid submissions remain deterministic and continue returning `409 CONFLICT` instead of a generic error.
4. Prefer explicit retryable `503` mapping over generic `500` when preview/serverless transaction failures occur.