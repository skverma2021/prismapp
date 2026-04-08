# Week 1 Day 5 Closeout Plan

Status: Ready to execute
Date: 2026-03-30
Owner: Engineering

## 1) Day 5 Goal

Close Week 1 with Contribution capture flow stable, testable, and documented.

## 2) Day 5 Deliverables

1. Capture UI supports:
   - monthly and yearly heads,
   - ledger-aware month selection,
   - direct submit to POST /api/contributions,
   - unit/resident ID helper UX for payUnit=2 testing.
2. Seed baseline includes canonical contribution heads and active rates.
3. Known test-head noise reduced in dropdown by default filter.
4. Build/lint green.
5. Manual UAT checklist prepared and executed for core scenarios.

## 3) Manual UAT Checklist (Capture)

1. Monthly head appears and allows unpaid month selection.
2. Yearly head appears and resolves to yearly period (refMonth 0).
3. payUnit=1 works without person count.
4. payUnit=2 blocks submit without person count.
5. payUnit=2 submit works when active resident exists.
6. payUnit=3 works with quantity fixed to 1.
7. Duplicate post for same unit/head/period returns conflict error.
8. Success path clears transient fields and shows success message.
9. Unit ID copy helper works.
10. Resident ID copy helper works.

## 4) Exit Criteria for Week 1

1. npm run lint passes.
2. npm run build passes.
3. UI can successfully create contribution entries for monthly and yearly heads.
4. UI can reproduce at least one expected precondition failure and one duplicate conflict.
5. Vault planning docs are up to date.

## 5) Week 2 Start Conditions

1. Proceed to correction UI and reports UI completion.
2. Add contribution-focused UAT evidence artifacts.
3. Begin app-shell planning implementation (home + nav scaffold) in parallel if capacity allows.
