# Current Sprint Board

Status: In Progress
Date: 2026-04-01
Owner: Engineering

## Purpose
Provide one short-horizon execution board for the active sprint window.

This file should stay concise and operational. Historical detail belongs in evidence or archived notes.

## Current Focus
Week 3 shell work is complete. Current focus is preparing a clean handoff into Week 4 authentication work.

## Done
1. Week 2 contribution scope completed and validated.
2. Public landing page added.
3. Dashboard shell layout added.
4. Role-aware home page added.
5. Mock session adapter added for Week 3 shell work.
6. Shared navigation metadata added.
7. Shared page-header component added.
8. Shared state-surface component added.
9. Contributions route wrapped with shared shell layout.
10. Reports routes wrapped with shared shell layout.
11. Root metadata and visual baseline updated.
12. Lint passed after shell changes.
13. Build passed after shell changes.
14. Route smoke checks passed for `/`, `/home`, `/contributions`, transaction report, and paid/unpaid matrix.
15. Repeated inline notices were extracted into a shared component.
16. Contribution and report screens now use shell-owned role context.
17. Final Week 3 shell smoke notes were recorded.

## In Progress
1. Stabilize the mock session boundary so it can be replaced cleanly in Week 4.
2. Prepare the Week 4 auth adapter contract and implementation sequence.

## Next

### Week 4 Preparation
1. Finalize auth adapter contract.
2. Introduce credentials login flow.
3. Add session persistence and protected routes.
4. Replace test-style UI auth inputs with session-backed role/user context.

## Risks
1. Shell and page responsibilities may overlap if repeated page-local UI is not cleaned up.
2. Auth retrofit can still cause UI churn if the mock adapter contract is not kept stable.
3. Master-data UI work will lag unless Week 4 auth finishes on time.

## References
1. `Product-Delivery-Strategy.md`
2. `Execution-Status.md`
3. `Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`
4. `Day-10-Release-Readiness.md`
5. `Evidence/Week-3-Shell-Smoke-Notes.md`