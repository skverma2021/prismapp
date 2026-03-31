# Week 3 Kickoff Items - Home, Navigation, Auth Shell

Status: Draft Ready
Date: 2026-03-31
Owner: Engineering

## Objective
Establish platform shell foundations before broad module UI expansion.

## Deliverables
1. Home page with role-aware entry cards (SOCIETY_ADMIN, MANAGER, READ_ONLY).
2. Shared dashboard layout with top navigation and side module menu.
3. Route-group structure for shell and module pages.
4. Shared global state patterns for loading/error/empty banners.
5. Auth shell contract integration points for Week 4 credentials flow.

## Suggested Route Shape
1. app/(public)/page.tsx for landing/login entry
2. app/(dashboard)/layout.tsx for authenticated shell
3. app/(dashboard)/home/page.tsx for role-aware start page
4. app/(dashboard)/contributions/page.tsx and reports pages within shell

## Technical Tasks
1. Create reusable nav config with role visibility rules.
2. Move current contributions and reports pages into shell-compatible segments.
3. Add shared page header and breadcrumb component.
4. Add common empty/loading/error surface component.
5. Define auth context interface and session placeholder adapter.

## Acceptance Criteria
1. Navigation is consistent across contribution and report routes.
2. Role-based menu visibility works via mocked role source.
3. Existing Week 2 flows remain reachable with no regression.
4. Lint and build pass after shell integration.

## Risks
1. Route migration may break direct links if redirects are not handled.
2. Early auth assumptions may require rework if session schema changes.

## Mitigations
1. Add compatibility redirects for moved routes.
2. Keep auth boundary as adapter interface until Week 4 implementation.
