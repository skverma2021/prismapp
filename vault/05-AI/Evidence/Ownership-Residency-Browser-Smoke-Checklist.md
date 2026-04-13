# Ownership and Residency Browser Smoke Checklist

Status: Draft
Date: 2026-04-13
Owner: Engineering

## Purpose
Capture the remaining browser-flow verification for ownership and residency scenarios that are not yet practical to automate with the current script-only backend harness.

## Scope
1. Builder inventory to transfer to residency operator flow.
2. Cross-screen freshness for individuals, units, and contribution heads.
3. No-refresh verification for lookup state after successful mutations.

## C1. Builder Inventory to Residency Happy Path
1. Sign in as `MANAGER` or `SOCIETY_ADMIN`.
2. Open Units and create a new unit with a valid `inceptionDt`.
Expected:
- Unit saves successfully.
- New unit starts in builder inventory.
3. Open Ownerships and confirm the new unit appears.
Expected:
- Unit is listed.
- Owner display shows builder inventory context, not a normal person.
4. Create a new individual on Individuals.
5. Return to Ownerships without hard refresh.
Expected:
- New individual appears in the transfer owner dropdown.
6. Transfer ownership to the new individual.
Expected:
- Transfer succeeds.
- Unit becomes residency-creatable immediately.
7. Open Residencies without hard refresh.
Expected:
- The transferred unit appears in the create-residency unit dropdown.
8. Create a second new individual on Individuals for residency.
9. Return to Residencies without hard refresh.
Expected:
- New resident appears in the individual dropdown.
10. Create the residency.
Expected:
- Residency saves successfully.
- No generic unexpected server error appears.

## C2. Cross-Screen Freshness
### Individuals
1. Create an individual in Individuals.
2. Navigate to Ownerships.
Expected:
- Individual appears in owner picker.
3. Navigate to Residencies.
Expected:
- Individual appears in resident picker.
4. Navigate to Contributions.
Expected:
- Individual appears in depositor picker.

### Units
1. Create a unit in Units.
2. Navigate to Ownerships.
Expected:
- Unit appears in unit picker.
3. Navigate to Residencies.
Expected:
- Unit appears when ownership rules make it eligible.
4. Navigate to Contributions.
Expected:
- Unit appears in unit picker.

### Contribution Heads
1. Create a contribution head in Contribution Heads.
2. Navigate to Contribution Rates.
Expected:
- Head appears in the head picker.
3. Navigate to Contributions.
Expected:
- Head appears in the posting picker.

## Failure Notes Template
1. Route or screen:
2. Mutation performed:
3. Expected immediate visibility:
4. Actual behavior:
5. Was hard refresh required:
6. Error code or message if shown:

## Exit Signal
This checklist can be marked pass when the operator can complete all listed flows using normal in-app navigation only, with no logout/login or browser refresh required.
