# Ownership and Residency Regression Matrix

## Purpose
This matrix converts recent preview and local debugging into a repeatable regression plan for timeline flows.

It is intentionally scoped to:
- ownership continuity
- builder inventory handover
- residency eligibility and creation
- stale lookup fallout after mutations
- API contract stability for timeline errors

The current repo has script-style API checks, but not a formal test framework. Use this matrix to drive the next testing pass and to decide what should be automated first.

## Current Coverage Snapshot
- Existing script: [scripts/test-timelines-api.mjs](scripts/test-timelines-api.mjs)
- Existing timeline service logic: [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts)
- Existing residency service logic: [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts)

Already covered at a basic level:
- unauthenticated mutation rejected
- read-only mutation rejected
- ownership before unit inception rejected
- ownership missing unit or individual rejected
- system identity rejected in normal ownership workflow
- builder-owned unit excluded from residency creation eligibility
- residency blocked while unit is still in builder inventory
- system identity rejected in normal residency workflow
- builder-to-natural-owner transfer succeeds
- transfer to same owner rejected
- transfer on current-owner start date rejected
- future planned natural owner blocks transfer
- redundant future builder rows are repaired during transfer
- ownership history patch/delete endpoints remain immutable
- overlapping ownership rejected
- overlapping residency rejected
- residency before unit inception rejected
- residency missing unit or individual rejected
- adjacent ownership transfer succeeds
- adjacent residency succeeds
- residency update rejects invalid end dates and overlap with next row
- residency delete endpoint remains immutable
- resident-eligible unit list drops the unit once no active residency remains
- maintenance repair script detects crafted redundant builder rows in dry-run mode
- maintenance repair script deletes crafted redundant builder rows in apply mode
- retryable connectivity and concurrency failures map to `503 SERVICE_UNAVAILABLE`

Not yet covered well enough:
- lookup freshness after create and transfer flows
- browser-flow regressions across screens without hard refresh

## Priority Order
1. Service and API contract regressions for ownership transfer and residency creation
2. Browser workflow regressions for create-owner and create-resident flows
3. Cache invalidation regressions for cross-screen lookup freshness
4. Cleanup and legacy-data repair scenarios

## A. Ownership Domain Rules

### A1. Baseline Ownership Creation
Objective: confirm the first ownership row starts correctly and obeys unit inception.

Cases:
1. Create ownership on exact unit inception date: expect `201`.
2. Create ownership before unit inception date: expect `400 VALIDATION_ERROR`.
3. Create ownership for non-existent unit: expect `404 NOT_FOUND`.
4. Create ownership for non-existent individual: expect `404 NOT_FOUND`.
5. Create ownership using system identity: expect `412 PRECONDITION_FAILED`.

Best automation target:
- service-level and API-level

Primary references:
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L86)
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L253)

### A2. Continuity and Overlap
Objective: ownership history remains gap-free and non-overlapping.

Cases:
1. Overlapping ownership row on same unit: expect `409 CONFLICT`.
2. Gap between owner A end date and owner B start date: expect `409 CONFLICT`.
3. Two adjacent rows with correct next-day continuity: expect success.
4. Future row after an active open-ended owner: expect `409 CONFLICT` when using direct create.

Best automation target:
- service-level first, then API contract

Primary references:
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L18)
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L45)

### A3. Transfer Workflow
Objective: transfer behaves correctly for real handovers and rejects invalid scheduling.

Cases:
1. Transfer from active builder inventory row to a real owner: expect `201`.
2. Transfer from active natural owner to another natural owner on valid date: expect `201`.
3. Transfer to same active owner: expect `400 VALIDATION_ERROR`.
4. Transfer on same day as current owner start date: expect `412 PRECONDITION_FAILED`.
5. Transfer when there is no active owner on the date: expect `412 PRECONDITION_FAILED`.
6. Transfer when a future planned natural owner already exists: expect `412 PRECONDITION_FAILED`.
7. Transfer when only redundant future builder rows exist: expect success and builder rows removed.

Best automation target:
- service-level plus API script

Primary references:
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L318)

## B. Residency Domain Rules

### B1. Residency Preconditions
Objective: residency requires a real active owner and a normal individual resident.

Cases:
1. Create residency when active owner is builder inventory: expect `412 PRECONDITION_FAILED`.
2. Create residency after ownership transfer to real individual: expect `201`.
3. Create residency with system identity as resident: expect `412 PRECONDITION_FAILED`.
4. Create residency before unit inception date: expect `400 VALIDATION_ERROR`.
5. Create residency for missing unit or missing individual: expect `404 NOT_FOUND`.

Best automation target:
- service-level and API-level

Primary references:
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L16)
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L49)
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L235)

### B2. Residency Timeline Integrity
Objective: residency ranges for the same unit cannot overlap and can be retired safely.

Cases:
1. Overlapping residency on same unit: expect `409 CONFLICT`.
2. Adjacent residency ranges: expect success.
3. Update residency end date before start date: expect `400 VALIDATION_ERROR`.
4. Update residency end date to overlap the next row: expect `409 CONFLICT`.
5. Delete residency history: expect `412 PRECONDITION_FAILED`.

Best automation target:
- service-level and API contract

Primary references:
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L105)
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L257)

## C. Cross-Workflow Scenarios

### C1. Builder Inventory to Residency Happy Path
Objective: cover the exact flow that recently failed in preview.

Steps:
1. Create block and unit.
2. Confirm unit starts in builder inventory.
3. Create new individual owner.
4. Transfer ownership to that owner.
5. Open residency create flow.
6. Confirm the unit appears as residency-creatable without full browser refresh.
7. Create new individual resident.
8. Confirm the new individual appears in residency dropdown without full browser refresh.
9. Create residency successfully.

Expected result:
- end-to-end success with no hard refresh and no generic server error

Best automation target:
- browser-level or scripted UI smoke check

### C2. Cross-Screen Freshness
Objective: new data created on one screen is immediately usable on another.

Cases:
1. Create individual on Individuals screen, navigate to Ownerships screen: individual should appear.
2. Create individual on Individuals screen, navigate to Residencies screen: individual should appear.
3. Create unit on Units screen, navigate to Ownerships screen: unit should appear.
4. Create unit on Units screen, navigate to Contributions screen: unit should appear.
5. Create contribution head, navigate to Contribution Rates and Contributions: head should appear.

Expected result:
- normal app navigation is sufficient; logout/login or hard refresh is not required

Best automation target:
- browser smoke test or targeted client-state integration checks

## D. Eligibility Endpoint Regressions

### D1. Ownership-Driven Residency Eligibility
Objective: the residency create unit list tracks ownership correctly.

Cases:
1. Builder-owned unit excluded from `/api/ownerships/residency-eligible-unit-ids`.
2. Unit included immediately after transfer to real owner.
3. Unit remains included when owner changes from one real individual to another.
4. Unit excluded if no active owner exists for the target date.

Primary reference:
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L241)

### D2. Residency-Driven Resident Eligibility
Objective: contribution capture sees resident-count eligible units correctly.

Cases:
1. Unit excluded from `/api/residencies/eligible-unit-ids` when no active residency exists.
2. Unit included immediately after active residency creation.
3. Unit excluded after active residency is closed and no replacement row exists.

Primary reference:
- [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L205)

## E. API Contract Stability

### E1. Auth and Role Mapping
Cases:
1. Unauthenticated timeline mutation returns `401 UNAUTHORIZED`.
2. Read-only timeline mutation returns `403 FORBIDDEN`.

Existing partial coverage:
- [scripts/test-timelines-api.mjs](scripts/test-timelines-api.mjs#L54)
- [scripts/test-timelines-api.mjs](scripts/test-timelines-api.mjs#L65)

### E2. Error Mapping
Cases:
1. Domain overlap violations return `409 CONFLICT`.
2. Ownership/residency preconditions return `412 PRECONDITION_FAILED`.
3. Connectivity and retryable DB failures return `503 SERVICE_UNAVAILABLE` with retryable error envelope.

Primary references:
- [app/api/ownerships/transfer/route.ts](app/api/ownerships/transfer/route.ts)
- [app/api/residencies/route.ts](app/api/residencies/route.ts)
- [src/lib/api-response.ts](src/lib/api-response.ts)

## F. Legacy Data and Repair Scenarios
Objective: ensure older inconsistent data does not silently re-break runtime flows.

Cases:
1. Redundant future builder rows are cleaned during transfer.
2. Maintenance script detects duplicate/redundant builder rows in dry-run mode.
3. Maintenance script deletes the targeted rows in apply mode.
4. After cleanup, transfer and residency create still succeed.

Primary references:
- [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L330)
- [scripts/repair-builder-ownerships.mjs](scripts/repair-builder-ownerships.mjs)

## Recommended Automation Sequence
1. Expand [scripts/test-timelines-api.mjs](scripts/test-timelines-api.mjs) with missing ownership and residency API cases.
2. Add direct error-mapping regression coverage for retryable `503` behavior.
3. Add a browser-level smoke harness for the builder inventory to transfer to residency flow.
4. Add dedicated lookup freshness checks for individuals, units, and contribution heads.
5. Move high-value service rules into smaller isolated tests once a formal test runner is introduced.

## Exit Criteria for Timeline Hardening
The ownership and residency area can be treated as regression-protected when:
1. All cases in sections A through E have an automation target.
2. The builder inventory handover workflow passes both locally and in preview.
3. Cross-screen create and immediate-use flows no longer depend on browser refresh.
4. Cleanup script coverage exists for legacy data artifacts but is no longer needed for newly created data.