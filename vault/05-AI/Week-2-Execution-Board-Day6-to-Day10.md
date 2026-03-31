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

Acceptance:
1. Filter round-trip works.
2. CSV matches visible filters.

## Day 8 - Reports UI (Paid/Unpaid Matrix)

1. Build paid/unpaid matrix screen.
2. Required filters: year and head.
3. Optional filter: block.
4. Add CSV export.

Acceptance:
1. Matrix values align with backend.
2. CSV export matches matrix filter context.

## Day 9 - Hardening + Edge Cases

1. Strengthen empty/error/loading states for capture and correction.
2. Add duplicate and precondition UX hints.
3. Validate form guard paths for payUnit 1/2/3 monthly/yearly.
4. Add regression script notes and run core API suites.

Acceptance:
1. No silent failures.
2. User-facing messages are specific and actionable.

## Day 10 - UAT + Release Readiness

1. Execute manual UAT checklist for capture + correction + reports.
2. Final pass: lint + build + API smoke tests.
3. Freeze docs in vault with known limitations and next backlog.
4. Prepare Week 3 kickoff items (home/nav/auth shell).

Acceptance:
1. Week 2 contribution scope signed off.
2. Outstanding gaps documented with clear owner and priority.
