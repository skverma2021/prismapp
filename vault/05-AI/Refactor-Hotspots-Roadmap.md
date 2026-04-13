# Refactor Hotspots Roadmap

## Purpose
This roadmap identifies areas that deserve refactoring before more modules are added.

The goal is not a rewrite. The goal is to reduce the chance that new features re-open the same classes of bugs:
- stale cross-screen state
- timeline-policy drift
- duplicated eligibility logic
- brittle script-based testing

## Hotspot 1: Lookup Cache and Invalidation

### Why it matters
The most likely recurring fragility today is stale lookup data after mutations on another screen.

Current state:
- Cached lookup loaders live in [src/lib/master-data-lookups.ts](src/lib/master-data-lookups.ts#L140).
- The dashboard shell prewarms common lookups in [src/components/shell/dashboard-shell.tsx](src/components/shell/dashboard-shell.tsx#L20).
- Some invalidation exists for individuals and ownership-dependent lists, but not as a general design.

Observed risk:
- every new mutable lookup source can fail silently until someone remembers to add a matching invalidation path

### Refactor goal
Move from manual, page-specific invalidation to a small lookup registry with explicit ownership of:
- cache key
- source endpoint
- freshness policy
- invalidating mutation types

### Recommended shape
1. Define lookup keys centrally.
2. Add one shared `invalidateLookups(keys)` helper.
3. Add semantic wrappers such as `invalidateUnitLookups`, `invalidateIndividualLookups`, `invalidateContributionHeadLookups`.
4. Distinguish static-ish lookups from state-derived lookups that must always fetch fresh.
5. Keep `prewarmCommonLookups()` limited to truly stable data.

### Priority
Do now.

### Expected benefit
Cross-screen create and update flows stop depending on refresh behavior and become mechanically safer.

## Hotspot 2: Ownership Transfer Transaction Complexity

### Why it matters
The ownership transfer path has become the densest timeline policy function in the app.

Current state:
- Transfer logic sits in [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L318).
- It currently performs reference validation, future-row conflict detection, redundant builder-row cleanup, active-owner resolution, date truncation, continuity checks, and row creation inside one transaction flow.

Observed risk:
- the logic is correctable, but increasingly hard to reason about and easy to regress when new rules are added

### Refactor goal
Split transfer into explicit policy steps with focused helper names.

### Suggested breakdown
1. `loadScheduledOwnershipRows()`
2. `classifyFutureOwnershipRows()`
3. `repairRedundantBuilderRows()`
4. `loadActiveOwnershipAtDate()`
5. `validateTransferDateAgainstCurrentOwner()`
6. `applyOwnershipTransfer()`

### Priority
Do soon, after regression coverage improves.

### Expected benefit
Future ownership rules become easier to review, test, and extend without re-reading one long transaction body.

## Hotspot 3: Timeline Policy Duplication

### Why it matters
Ownership and residency each contain their own overlap logic, inception checks, and active-row checks.

Current state:
- ownership continuity and overlap rules are in [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L18) and [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L45)
- residency overlap and owner-precondition rules are in [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L8), [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L49), and [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L105)

Observed risk:
- rules that are conceptually related can drift in naming, date semantics, or query patterns

### Refactor goal
Extract a small timeline-policy utility layer that standardizes date-range semantics without flattening domain differences.

### Suggested scope
1. Shared date-range helpers for inclusive range overlap and adjacency.
2. Shared helper for `ensureNotBeforeUnitInception` style checks.
3. Shared naming conventions for active-at-date queries.

### Priority
Do later, after hotspot 2.

### Expected benefit
Lower cognitive load and fewer off-by-one or interpretation mismatches across timeline modules.

## Hotspot 4: Eligibility Logic Vocabulary

### Why it matters
The app has multiple “eligible unit” concepts already, and more will appear as contributions and reporting expand.

Current state:
- ownership-driven residency-create eligibility is in [src/modules/ownerships/ownerships.service.ts](src/modules/ownerships/ownerships.service.ts#L241)
- residency-driven contribution eligibility is in [src/modules/residencies/residencies.service.ts](src/modules/residencies/residencies.service.ts#L205)

Observed risk:
- similar names can hide very different business meaning, which increases misuse by future callers

### Refactor goal
Adopt domain-explicit names and, if needed, a small eligibility module.

### Better naming direction
1. `listUnitsEligibleForResidencyCreation()`
2. `listUnitsEligibleForPerResidentContributions()`
3. `listUnitsWithActiveNaturalOwner()`

### Priority
Do soon, together with transfer/service cleanup if feasible.

### Expected benefit
Reduces accidental coupling and makes future occupancy-based modules easier to add.

## Hotspot 5: Script-Only Test Strategy

### Why it matters
The current API scripts are useful, but they are drifting against domain immutability rules and are expensive to keep accurate as behavior evolves.

Current state:
- script entry point: [scripts/test-timelines-api.mjs](scripts/test-timelines-api.mjs)
- scripts start a dev server and perform end-to-end HTTP calls
- cleanup logic still reflects an earlier assumption that timeline rows could be removed more directly

Observed risk:
- tests become unreliable at exactly the moment the domain gets stricter

### Refactor goal
Keep script checks for smoke coverage, but add a clearer testing pyramid.

### Recommended direction
1. Preserve API smoke scripts for route and auth checks.
2. Introduce focused service-level tests for ownership and residency policies.
3. Add one browser-level flow for builder inventory to transfer to residency.

### Priority
Do now for planning, do soon for execution.

### Expected benefit
Faster diagnosis, less brittle cleanup logic, and better confidence when changing timeline rules.

## Hotspot 6: Route-to-Service Thinness Without Shared Mutation Aftermath

### Why it matters
Server rules are becoming centralized, which is good, but the client aftermath of mutations is still page-local.

Current state:
- routes are thin and mostly healthy
- client pages decide what to reload, clear, or invalidate after success

Observed risk:
- business mutation succeeds, but the UI state after success is inconsistent across pages

### Refactor goal
Standardize post-mutation client behavior for shared entities.

### Suggested direction
1. Define mutation success handlers per entity class.
2. Co-locate invalidation policy with the lookup registry.
3. Treat “created entity usable elsewhere immediately” as a first-class acceptance rule.

### Priority
Do soon, tied to hotspot 1.

### Expected benefit
Less repeated ad hoc fix work for each screen.

## Sequencing Recommendation
1. First, implement the regression matrix in executable form for ownership and residency.
2. Then refactor hotspot 1: lookup invalidation design.
3. Then refactor hotspot 2: ownership transfer decomposition.
4. Then clean up hotspot 4: eligibility naming and boundary clarity.
5. Finally, address hotspot 3 more broadly if more timeline-driven modules are added.

## Stop Conditions
Pause refactoring if:
1. a change starts altering business rules instead of structure
2. preview confidence drops because regression coverage is still weak
3. the code starts introducing abstractions that are broader than the current domain actually needs

## Success Criteria
This roadmap is paying off when:
1. new entities appear across screens without refresh workarounds
2. transfer and residency fixes stop requiring multi-file reactive debugging
3. policy changes can be explained as edits to small named helpers rather than surgery inside long transaction bodies
4. timeline regressions are caught before preview testing