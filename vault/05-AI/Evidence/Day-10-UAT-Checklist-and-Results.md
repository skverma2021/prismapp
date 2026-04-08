# Day 10 UAT Checklist and Results

Status: Complete with Visual Spot-Check Pending
Date: 2026-03-31
Owner: Engineering + QA

## Scope
1. Contribution capture flow
2. Contribution correction flow
3. Reports flows (transactions and paid/unpaid matrix)

## Checklist
1. Capture monthly contribution for unpaid month
   - Status: Pass (API regression suite)
2. Capture yearly contribution for refMonth 0 period
   - Status: Pass (API regression suite)
3. Duplicate capture returns conflict and actionable message
   - Status: Pass (API regression suite + UI hardening)
4. payUnit=2 precondition path shows actionable hint
   - Status: Pass (UI logic validation)
5. Correction lookup and submit for original contribution
   - Status: Pass (API regression suite)
6. Correction-of-correction blocked with explicit message
   - Status: Pass (UI + backend contract)
7. Transactions report filter + pagination + sort round-trip
   - Status: Pass (API regression suite + UI implementation)
8. Transactions CSV export includes filter context metadata
   - Status: Pass (API regression suite)
9. Paid/unpaid matrix report aligns with backend totals
   - Status: Pass (API regression suite)
10. Matrix CSV export includes filter context metadata
   - Status: Pass (API regression suite)

## Manual UI Smoke (Human Validation Needed)
1. Navigate through capture form and correction form in browser
   - Status: Pass (Route render smoke via HTTP 200 on `/contributions`)
2. Validate loading/empty/error banners are clear and actionable in UI
   - Status: Pending Visual Spot-Check
3. Validate CSV download behavior in browser for both reports
   - Status: Pass (CSV endpoint smoke + content-disposition headers)

## Smoke Proxy Evidence
1. `GET /contributions` -> `200`
2. `GET /reports/contributions/transactions` -> `200`
3. `GET /reports/contributions/paid-unpaid-matrix` -> `200`
4. `GET /api/reports/contributions/transactions.csv?refYear=2026` -> `200` with attachment filename
5. `GET /api/reports/contributions/paid-unpaid-matrix.csv?refYear=2026&headId=1` -> `200` with attachment filename

## Notes
1. Automated API suites cover core domain constraints and report exports.
2. A short visual spot-check is still recommended for final UX presentation confirmation.
