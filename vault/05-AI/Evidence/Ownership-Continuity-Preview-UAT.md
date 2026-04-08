# Ownership Continuity Preview UAT

Status: Pass
Date: 2026-04-09
Owner: Engineering + Operator Review

## Scope
1. Preview deployment review for `preview/ownership-continuity`.
2. Deployed commit: `cf74e21`.
3. Focus: builder inventory bootstrap, ownership continuity, picker filtering, and protected-route auth behavior.

## Manual Results
1. Created a new unit `Ashok, 1503`.
   - Status: Pass
   - Result: Builder inventory was created from `inceptionDt` as expected.
2. Created a new ownership record and then transferred ownership to an individual.
   - Status: Pass
   - Result: Transfer completed successfully with no reported ownership gap.
3. Checked ordinary individual, residency, and depositor pickers.
   - Status: Pass
   - Result: Builder inventory did not appear in normal pickers.
4. Checked protected-route auth behavior with no active session.
   - Status: Pass
   - Result: Public landing page remained visible with login form and public entry links. Attempts to open protected contribution and report routes redirected to auth-required login feedback instead of loading the protected screen.
5. Checked protected-route auth behavior with a `READ_ONLY` session.
   - Status: Pass
   - Result: Direct navigation to `/contributions` redirected to `/home?auth=denied&from=%2Fcontributions` with the expected role-denied warning.
6. Checked report access with a `READ_ONLY` session.
   - Status: Pass
   - Result: Transactions report loaded successfully.

## Outcome
1. Ownership-continuity preview validation passed for the targeted branch behaviors.
2. The preview is acceptable for branch-level ownership continuity review.
3. The remaining deployment decision is whether to cut a newer preview for local report URL-state changes or hold those changes until after the current branch validation window.