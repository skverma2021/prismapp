# Vault Reorganization Proposal

Status: Adopted (Option A)
Date: 2026-04-01
Owner: Engineering

## Adoption Note
Option A was adopted on 2026-04-01.

Implementation applied so far:
1. `Execution-Status.md` added as the single current-status snapshot.
2. `Current-Sprint-Board.md` added as the active execution board.
3. `Evidence/` added as the target landing area for validation and release artifacts.
4. `Archive/` added as the target landing area for historical closeout artifacts.
5. Existing files were intentionally left in place to avoid link breakage during the first cleanup pass.

## Recommendation
Do a light reorganization, not a rewrite.

Reason:
1. The vault content is already strong.
2. The main problem is discoverability of current status, not lack of documentation.
3. Domain and API documents are already grouped well enough.
4. The biggest clutter is inside `vault/05-AI`, where active plans, evidence, and historical notes are mixed together.

## What Should Stay As-Is
1. `vault/00-Core/`
2. `vault/01-Domain/`
3. `vault/03-API/`
4. `vault/04-Reports/`

These are acting as canonical reference areas and already fit the source-of-truth order described in `AGENTS.md`.

## What Should Improve
`vault/05-AI/` should better separate:
1. Current execution status
2. Active planning
3. Execution evidence
4. Historical archive

## Proposed Target Structure

### Option A: Minimal Structural Cleanup
Keep all current files in place, but add a small organizing layer:

1. `vault/05-AI/Execution-Status.md`
   Purpose: single current snapshot of done, in progress, and remaining work.
2. `vault/05-AI/Product-Delivery-Strategy.md`
   Purpose: long-lived roadmap and milestone intent.
3. `vault/05-AI/Current-Sprint-Board.md`
   Purpose: single active sprint board that replaces fragmented daily execution references.
4. `vault/05-AI/Evidence/`
   Purpose: UAT, regression notes, release readiness, smoke results.
5. `vault/05-AI/Archive/`
   Purpose: older daily and weekly execution notes after they stop being active.

This is the safest option because it improves navigation without forcing widespread link changes immediately.

### Option B: Clearer Operational Structure
If you are willing to move files and update links, use this shape:

1. `vault/05-AI/00-Status/`
2. `vault/05-AI/01-Roadmap/`
3. `vault/05-AI/02-Execution-Boards/`
4. `vault/05-AI/03-Evidence/`
5. `vault/05-AI/99-Archive/`

Suggested contents:
1. `00-Status/Execution-Status.md`
2. `01-Roadmap/Product-Delivery-Strategy.md`
3. `01-Roadmap/Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`
4. `02-Execution-Boards/Week-2-Execution-Board-Day6-to-Day10.md`
5. `03-Evidence/Day-9-Regression-Notes.md`
6. `03-Evidence/Day-10-UAT-Checklist-and-Results.md`
7. `03-Evidence/Day-10-Release-Readiness.md`
8. `99-Archive/Week-1-Day-5-Closeout.md`

## Recommended Next Step
Adopt Option A first.

Reason:
1. It gives immediate clarity.
2. It avoids breaking internal links right away.
3. It lets the team validate whether the new status artifact is sufficient before moving files physically.

## Suggested File Roles After Cleanup
1. `Product-Delivery-Strategy.md`: long-lived delivery roadmap.
2. `Execution-Status.md`: current truth about done, active, and remaining work.
3. `Current-Sprint-Board.md`: short-horizon execution tracker.
4. Evidence files: test, UAT, release, smoke, regression outputs.
5. Archive files: historical closeout and completed weekly notes.

## Migration Mapping From Current Files

### Keep Active
1. `Product-Delivery-Strategy.md`
2. `Week-3-Kickoff-Items-Home-Nav-Auth-Shell.md`
3. `Execution-Status.md`

### Treat As Evidence
1. `Day-9-Regression-Notes.md`
2. `Day-10-UAT-Checklist-and-Results.md`
3. `Day-10-Release-Readiness.md`

### Candidate For Archive
1. `Week-1-Day-5-Closeout.md`
2. Older completed daily execution notes once they are no longer referenced by the active sprint.

## Additional Metadata Recommendation
Add a simple frontmatter or top-of-file status field to active planning and evidence docs:
1. `planned`
2. `in progress`
3. `done`
4. `superseded`
5. `archived`

This will reduce confusion when multiple nearby documents discuss overlapping scope.

## Final Recommendation
1. Do not reorganize the entire vault now.
2. Add current-status and proposal documents first.
3. Move only `vault/05-AI` files later, and only after agreeing on the target operational structure.