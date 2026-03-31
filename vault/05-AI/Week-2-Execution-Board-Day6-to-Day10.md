# Week 2 Execution Board (Day 6 to Day 10)

Status: Active
Date: 2026-03-30
Owner: Engineering

## Day 6 - Correction Screen (Core)

Planned:
1. Lookup original contribution.
2. Show contribution details.
3. Capture reason code and reason text.
4. Submit correction via API.
5. Block correction-of-correction in UI and show backend errors.

Actual:
1. Implemented in contributions UI.
2. Lint and build passed.

## Day 7 - Reports UI (Transactions)

1. Build transactions report screen with filters:
   - year, month, head, unit, block, depositor, date range.
2. Add pagination and sort controls.
3. Add CSV export button using active filters.
4. Display API errors in shared banner format.

Actual:
1. Implemented new route UI at `/reports/contributions/transactions`.
2. Added all required Day 7 filters and wired report query round-trip.
3. Added page/pageSize + sort controls and server-backed pagination actions.
4. Added CSV export flow using active filters and auth headers.
5. Added shared error banner rendering for report/API failures.

Acceptance:
1. Filter round-trip works.
2. CSV matches visible filters.

## Day 8 - Reports UI (Paid/Unpaid Matrix)

1. Build paid/unpaid matrix screen.
2. Required filters: year and head.
3. Optional filter: block.
4. Add CSV export.

Actual:
1. Implemented new route UI at `/reports/contributions/paid-unpaid-matrix`.
2. Added required filters (year, head) and optional block filter.
3. Added matrix table with month status columns (Jan-Dec) and paid/unpaid counts.
4. Added totals panel (units, paid/unpaid cells, collection, expected, active rate).
5. Added CSV export flow with active filter context and auth headers.
6. Added shared error banner rendering for report/API failures.

Acceptance:
1. Matrix values align with backend.
2. CSV export matches matrix filter context.

## Day 9 - Hardening + Edge Cases

1. Strengthen empty/error/loading states for capture and correction.
2. Add duplicate and precondition UX hints.
3. Validate form guard paths for payUnit 1/2/3 monthly/yearly.
4. Add regression script notes and run core API suites.

Actual:
1. Hardened contribution capture initial load path with explicit loading, error, empty, and retry states.
2. Added duplicate/precondition actionable UX hints for capture and correction submit failures.
3. Added explicit payUnit/period guard-path checklist feedback for payUnit 1/2/3 with monthly/yearly conditions.
4. Hardened correction lookup and reports screens with explicit empty/loading/error guidance.
5. Added Day 9 regression notes and executed core API suites successfully (timelines, rates, contributions, reports).

Acceptance:
1. No silent failures.
2. User-facing messages are specific and actionable.

## Day 10 - UAT + Release Readiness

1. Execute manual UAT checklist for capture + correction + reports.
2. Final pass: lint + build + API smoke tests.
3. Freeze docs in vault with known limitations and next backlog.
4. Prepare Week 3 kickoff items (home/nav/auth shell).

Actual:
1. Added Day 10 UAT checklist/results artifact in `vault/05-AI/Day-10-UAT-Checklist-and-Results.md`.
2. Executed final verification pass: lint + build + API smoke suites (timelines, contribution-rates, contributions, reports).
3. Added release-readiness freeze doc with known limitations and prioritized backlog in `vault/05-AI/Day-10-Release-Readiness.md`.
4. Added Week 3 kickoff plan for home/nav/auth shell in `vault/05-AI/Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`.
5. Executed route and CSV smoke proxy checks successfully (all key pages `200`, CSV endpoints returning attachment headers).
6. Reduced remaining UAT item to optional visual spot-check for UX presentation only.

Acceptance:
1. Week 2 contribution scope signed off.
2. Outstanding gaps documented with clear owner and priority.
