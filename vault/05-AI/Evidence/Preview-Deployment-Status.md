# Preview Deployment Status

Status: Validated
Date: 2026-04-09
Owner: Engineering

## Deployment Summary
1. Environment: Preview
2. Provider: Vercel
3. Source branch: `preview/ownership-continuity`
4. Last validated deployed commit: `29dc19f`
5. Latest verified fix message: `fix(reports): use stable lookup endpoints on preview`
6. Latest observed deployment duration: `38s`
7. Earlier validated preview baseline: `cf74e21` (`feat(ownership): bootstrap builder inventory continuity`)

## Preview Domains
1. `prismapp-git-preview-owner-a08c65-shyam-krishna-vermas-projects.vercel.app`
2. `prismapp-riip1aynl-shyam-krishna-vermas-projects.vercel.app`

## Operational Meaning
1. The ownership-continuity branch is deployed and available for focused preview review.
2. The preview is suitable for UAT of builder bootstrap, continuity enforcement, transfer flow, and picker filtering.
3. Production state is not asserted by this note; this is preview-only evidence.

## Deployment Verification
1. A newer preview deployment is now live from commit `29dc19f`.
2. Transactions report filter dropdown activation on preview improved to approximately `7-8s` after the lookup-endpoint fix.
3. The earlier failing `Unable to load report filter options.` behavior is no longer observed in the verified preview.
4. Localhost still remains faster at approximately `2-3s`, but preview behavior is now materially improved from the earlier `21s` observation.

## New Candidate Awaiting Verification
1. Branch `preview/ownership-continuity` now has a newer local candidate pending push for dropdown interaction responsiveness on preview.
2. This candidate reduces synchronous select-driven rerender pressure in contribution capture, ownership transfer, and residency creation flows.
3. After push, the next authenticated preview check should specifically re-measure the previously reported `INP Issue` on the affected dropdowns.
4. Public HTTP probes remain unsuitable for full verification because the preview domain currently returns `401` to unauthenticated requests.

## Remaining Gap Versus Localhost
1. Preview dropdown activation is still slower than localhost, which suggests residual preview environment latency rather than a blocking application regression.
2. Further optimization should be treated as performance tuning, not release-blocking correctness work.

## Recommended Validation on This Preview
1. Create a new unit and confirm builder inventory is created from `inceptionDt`.
2. Run ownership transfer and confirm no ownership gaps are introduced.
3. Confirm builder inventory does not appear in normal individual, residency, or depositor pickers.
4. Confirm protected-route auth behavior remains acceptable on the preview shell.

## Validation Evidence
1. See `Ownership-Continuity-Preview-UAT.md` for the recorded manual confirmation results against this preview deployment.
2. Preview report-loading improvement was manually rechecked after commit `29dc19f` and observed as successful.
