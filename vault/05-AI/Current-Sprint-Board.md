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

## In Progress
1. Align route-handler authorization with Auth.js-backed session resolution.
2. Add logout and auth feedback refinements across the shell.
3. Prepare next-pass master-data UI baseline planning.

## Next

### Immediate Next Steps
1. Finalize route-handler auth/session alignment.
2. Add logout/sign-out flow and auth feedback refinements.
3. Start master-data UI baseline for blocks, units, and individuals.
4. Standardize shared table/filter/form patterns for operator screens.

## Risks
1. Shell and page responsibilities may overlap if repeated page-local UI is not cleaned up.
2. Route-handler and UI auth can drift if server-side session alignment is not finished cleanly.
3. Large seeded datasets can still surface performance issues in operator screens if client loading is not kept paginated and incremental.
4. Master-data UI work will lag unless auth/session alignment closes soon.

## References
1. `Product-Delivery-Strategy.md`
2. `Execution-Status.md`
3. `Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`
4. `Day-10-Release-Readiness.md`
5. `Evidence/Week-3-Shell-Smoke-Notes.md`