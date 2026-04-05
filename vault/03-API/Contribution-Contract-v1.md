# Contribution Contract v1

Status: Frozen for V1
Date: 2026-03-27
Owner: Solo build plan Day 1 output

## 1) Scope Freeze
This contract covers the contribution module backend and frontend integration points:
- Contribution heads
- Contribution rates
- Contribution periods
- Contributions capture and lookup
- Contribution correction flow
- Monthly ledger helper for capture UX
- Contribution reports and CSV exports

Out of scope for v1:
- Non-linear pricing runtime behavior (tiering/discount/waiver logic)
- Approval workflow for pricing exceptions

## 2) Shared API Envelope
Success shape:
- ok: true
- data: payload

Error shape:
- ok: false
- error.code
- error.message
- error.details
- error.retryable

## 3) Auth Contract
Session transport:
- Auth.js session cookie

Roles:
- SOCIETY_ADMIN
- MANAGER
- READ_ONLY

Authorization policy:
- Domain read endpoints: SOCIETY_ADMIN, MANAGER, READ_ONLY
- Mutation endpoints: SOCIETY_ADMIN or MANAGER

## 4) Stable Error Mapping
- 400 VALIDATION_ERROR: bad payload/query, invalid sort/filter fields
- 401 UNAUTHORIZED: missing/invalid authenticated session
- 403 FORBIDDEN: role does not have required permission
- 404 NOT_FOUND: referenced records do not exist
- 409 CONFLICT: unique/overlap/duplicate contribution conflict
- 412 PRECONDITION_FAILED: domain guard failure (immutability, current-year constraints, payUnit preconditions)
- 500 INTERNAL_ERROR: unexpected server-side failure

## 5) Endpoint Contract Freeze

### 5.1 Contribution Heads
Endpoint: GET /api/contribution-heads
- Query: page, pageSize, q, period, payUnit, sortBy, sortDir
- sortBy allowed: description, payUnit, period, createdAt

Endpoint: POST /api/contribution-heads
- Auth: mutation role required
- Body required: description, payUnit, period (MONTH or YEAR)

Endpoint: GET /api/contribution-heads/{id}
- Returns head with rates and contribution count

Endpoint: PATCH /api/contribution-heads/{id}
- Auth: mutation role required
- Body: any of description, payUnit, period

Endpoint: DELETE /api/contribution-heads/{id}
- Auth: mutation role required
- Response: 204 on success

### 5.2 Contribution Rates
Endpoint: GET /api/contribution-rates
- Query: page, pageSize, contributionHeadId, activeOn, sortBy, sortDir
- sortBy allowed: fromDt, toDt, amt, createdAt

Endpoint: POST /api/contribution-rates
- Auth: mutation role required
- Body required: contributionHeadId, fromDt, amt
- Body optional: toDt, reference
- Validation: no overlap for same head rate history

Endpoint: GET /api/contribution-rates/{id}
- Returns one rate with contribution head

Endpoint: PATCH /api/contribution-rates/{id}
- Auth: mutation role required
- Body optional: toDt, reference
- Validation: `toDt` must be >= `fromDt`; no overlap for same head rate history

### 5.3 Contribution Periods
Endpoint: GET /api/contribution-periods
- Query: page, pageSize, refYear, refMonth, sortBy, sortDir
- sortBy allowed: id, refYear, refMonth, createdAt

Endpoint: GET /api/contribution-periods/{id}
- Returns one period

### 5.4 Contributions
Endpoint: GET /api/contributions
- Query:
  - page, pageSize
  - unitId
  - headId
  - refYear, refMonth
  - depositedBy
  - transactionDateFrom, transactionDateTo
  - sortBy, sortDir
- sortBy allowed: transactionDateTime, createdAt, id

Endpoint: POST /api/contributions
- Auth: mutation role required
- Body required:
  - unitId
  - contributionHeadId
  - contributionPeriodIds (explicit selection)
  - transactionId
  - transactionDateTime
  - depositedBy
- Body conditional:
  - availingPersonCount required for payUnit=2
- Body optional:
  - comment (accountability note)
  - reference

Posting rules:
- Periods must be in current year only
- Monthly heads must use month periods (1..12)
- Yearly heads must use exactly one yearly period (refMonth=0)
- Amount basis:
  - per-period detail amount = quantity x applicableRate
  - total payable = per-period amount x periodCount
- Applicable rate means effective as on transactionDateTime
- Duplicate guard on unit + head + period
- Net-zero unlock: repost for same unit + head + period is allowed only when prior net amount for that period is zero after compensation
- Posted entries are immutable

Endpoint: GET /api/contributions/{id}
- Returns one contribution with details and relations

Endpoint: PATCH /api/contributions/{id}
- Auth: mutation role required
- Always returns 412 PRECONDITION_FAILED (immutable)

Endpoint: DELETE /api/contributions/{id}
- Auth: mutation role required
- Always returns 412 PRECONDITION_FAILED (immutable)

### 5.5 Corrections
Endpoint: POST /api/contributions/corrections
- Auth: mutation role required
- Body required:
  - originalContributionId
  - transactionId
  - transactionDateTime
  - reasonCode
  - reasonText
- Body optional: depositedBy

Correction rules:
- Compensating entry only (no in-place update)
- Correction-of-correction not allowed

### 5.6 Month Ledger Helper (Capture UX)
Endpoint: GET /api/contributions/month-ledger
- Query required: unitId, headId, refYear
- Constraint: current year only
- Constraint: monthly head only
- Returns:
  - unit and head context
  - latestPaidMonth
  - rows for Jan..Dec
  - per-row status (Paid/Unpaid)
  - per-row amount and transaction refs

### 5.7 Reports
Endpoint: GET /api/reports/contributions/transactions
- Auth: SOCIETY_ADMIN/MANAGER/READ_ONLY
- Query required: refYear
- Optional filters: refMonth, headId, unitId, blockId, depositedBy, transactionDateFrom, transactionDateTo
- Pagination: page, pageSize
- Sorting: sortBy, sortDir

Endpoint: GET /api/reports/contributions/transactions.csv
- Same filters as transactions JSON
- Includes generation metadata headers

Endpoint: GET /api/reports/contributions/paid-unpaid-matrix
- Auth: SOCIETY_ADMIN/MANAGER/READ_ONLY
- Query required: refYear, headId
- Query optional: blockId

Endpoint: GET /api/reports/contributions/paid-unpaid-matrix.csv
- Same filters as matrix JSON
- Includes generation metadata headers

## 6) UI Screen Contract Notes

### 6.1 Screen: Record Contribution
UI fields:
- Head selector (required)
- Unit selector (required)
- Year selector (locked to current year)
- Month picker from ledger rows (for monthly heads)
- Yearly period selector auto-resolved (for yearly heads)
- Transaction ID and transaction datetime
- Deposited by individual
- payUnit=2: availing person count and optional comment

Payload mapping to POST /api/contributions:
- selected unpaid rows -> contributionPeriodIds
- availing person count -> availingPersonCount
- comment input -> comment

### 6.2 Screen: Contribution Correction
UI fields:
- original contribution selection
- reason code
- reason text
- transaction ID
- transaction datetime
- optional deposited by

Payload mapping to POST /api/contributions/corrections:
- field names must match API exactly

### 6.3 Screen: Reports
Transaction List:
- required refYear
- optional filters from endpoint contract
- paging and sorting controls
- CSV export uses same active filters

Paid/Unpaid Matrix:
- required refYear and head
- optional block
- CSV export uses same active filters

## 7) Acceptance Checklist Per Endpoint

- Heads list/create/get/update/delete
  - Validation, auth, pagination, sorting, not-found behavior verified

- Rates list/create/get
  - Overlap prevention and activeOn filtering verified

- Periods list/get
  - refMonth range and sort validation verified

- Contributions list/create/get
  - explicit period selection, current-year guard, rate-locking, duplicate guard, payUnit=2 conditional input, comment persistence verified

- Contributions patch/delete
  - immutability guard returns 412 verified

- Corrections create
  - compensating behavior and correction-of-correction guard verified

- Month ledger helper
  - returns 12 rows for monthly head, correct statuses, transaction refs, and latestPaidMonth verified

## 8) Execution Flow Reference

- POST runtime flowchart:
  - [Contribution-POST-Execution-Flow.md](./Contribution-POST-Execution-Flow.md)

- Reports JSON and CSV
  - filter parsing, totals consistency, role access, and CSV metadata verified

## 8) Definition of Day 1 Done
- Contract frozen in this document
- Error mapping frozen in this document
- UI-to-API field mapping documented
- Endpoint acceptance checklist documented
