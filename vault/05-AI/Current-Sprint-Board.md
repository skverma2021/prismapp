# Current Sprint Board

Status: In Progress
Date: 2026-04-02
Owner: Engineering

## Purpose
Provide one short-horizon execution board for the active sprint window.

This file should stay concise and operational. Historical detail belongs in evidence or archived notes.

## Current Focus
Shell and auth baseline are in place. Current focus is closing auth alignment gaps and stabilizing contribution/report operator UX before master-data UI work expands.

## Done
1. Week 2 contribution scope completed and validated.
2. Public landing page added.
3. Dashboard shell layout added.
4. Role-aware home page added.
5. Shared navigation metadata added.
6. Shared page-header component added.
7. Shared state-surface component added.
8. Contributions route wrapped with shared shell layout.
9. Reports routes wrapped with shared shell layout.
10. Root metadata and visual baseline updated.
11. Lint passed after shell changes.
12. Build passed after shell changes.
13. Route smoke checks passed for `/`, `/home`, `/contributions`, transaction report, and paid/unpaid matrix.
14. Repeated inline notices were extracted into a shared component.
15. Contribution and report screens now use shell-owned role context.
16. Final Week 3 shell smoke notes were recorded.
17. The shell session contract is now routed through a generic auth-session provider.
18. Client-side API auth headers are now built from one shared session helper.
19. Auth.js credentials login baseline is implemented.
20. Dashboard, contributions, and reports routes now require authenticated session state.
21. Demo app users are seeded into Prisma for local sign-in.
22. Deterministic operational block and unit seed data was aligned to Nalanda, Vaishali, and Rajgir.
23. Contribution and report unit labels now use `Block, Unit` formatting.
24. Contribution capture initial loading was reduced by separating head loading from background unit loading.
25. Per-person contribution capture now filters to resident-eligible units.
26. Transactions report filter loading now handles all unit pages instead of only page 1.
27. Paid/unpaid matrix performance was improved by batching report queries.
28. Paid/unpaid matrix yearly semantics were corrected to use refMonth = 0 and a Year status column.
29. Contribution capture payer selection now uses an individual-name dropdown.
30. Contribution capture now distinguishes payer identity from operator session identity in the UI.
31. Route-handler authorization is now aligned with Auth.js-backed session resolution.
32. Public entry now shows explicit auth-required and signed-out feedback states.
33. Dashboard home now shows explicit role-denied feedback after protected-route redirects.
34. Login and sign-out flows now provide clearer local credential and redirect feedback.
35. Master-data shell navigation now includes blocks, units, and individuals.
36. Blocks management UI baseline is now available with search, pagination, create, edit, and delete.
37. Units management UI baseline is now available with block filter, search, pagination, create, edit, and delete.
38. Individuals management UI baseline is now available with gender filter, search, pagination, create, edit, and delete.
39. Read-only individual views now mask email and mobile in the UI baseline.

## In Progress
1. Continue shell-level auth feedback refinements where session redirects surface outside home/public entry.
2. Extend master-data UI baseline beyond blocks, units, and individuals.
3. Standardize shared table/filter/form patterns for operator screens.

## Next

### Immediate Next Steps
1. Finish remaining shell-level auth feedback polish.
2. Add ownership and residency UI baseline on top of the new master-data pages.
3. Standardize shared table/filter/form patterns for operator screens.
4. Add cross-linking between units, individuals, and contribution workflows.

## Risks
1. Shell and page responsibilities may overlap if repeated page-local UI is not cleaned up.
2. Auth feedback can still feel inconsistent if redirect reasons are not surfaced uniformly across all protected shell routes.
3. Large seeded datasets can still surface performance issues in operator screens if client loading is not kept paginated and incremental.
4. Master-data UI consistency will drift if the shared table/filter/form patterns are not extracted soon.

## References
1. `Product-Delivery-Strategy.md`
2. `Execution-Status.md`
3. `Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`
4. `Day-10-Release-Readiness.md`
5. `Evidence/Week-3-Shell-Smoke-Notes.md`