# Template Usage Guide

Status: Active
Owner: Product + Engineering
Last Updated: 2026-03-20

## Purpose
This guide explains how to reuse the core vault templates in a new project in less than 30 minutes.

Templates covered:
1. `vault/00-Core/Roles-and-Permissions.md`
2. `vault/03-API/Error-Model.md`
3. `vault/03-API/Pagination-and-Filtering.md`
4. `vault/04-Reports/Contribution-Reports.md`
5. `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`

## Quick Start (30-Minute Flow)
1. Copy the 5 template files into the target project vault structure.
2. Replace project-specific terms (entity names, roles, payment terms, modules).
3. Fill the required decision checklist in each file (see below).
4. Link the finalized files in `AGENTS.md` source-of-truth and implementation checklist sections.
5. Freeze V1 decisions and move unresolved topics to Open Questions or a new ADR.

## What to Keep vs What to Change

### Keep As-Is
- Section structure and headings.
- V1 vs future-phase framing.
- Stable error envelope format.
- ADR format (`Context`, `Decision`, `Why`, `Consequences`, `Alternatives`, `Follow-up`).

### Customize
- Domain nouns (for example Unit, Contribution, Owner).
- Role names and permission matrix.
- Error mapping examples tied to your domain rules.
- Report filters/columns/totals.
- Compliance and approval requirements.

## File-by-File Adaptation Checklist

### 1) Roles and Permissions
File: `vault/00-Core/Roles-and-Permissions.md`

Mandatory edits:
1. Define exactly 2-4 V1 roles and avoid role explosion.
2. Fill capability matrix for all write operations.
3. Define payment actor model (who can pay vs who can record).
4. Define authorization behavior (`401` vs `403` references).
5. Add PII visibility rule by role.

Validation questions:
1. Can every mutation be mapped to one allowed role?
2. Are there any operations that currently rely only on UI visibility?
3. Is financial immutability role-independent?

### 2) Error Model
File: `vault/03-API/Error-Model.md`

Mandatory edits:
1. Keep one shared envelope for all API errors.
2. Confirm stable code catalog (`VALIDATION_ERROR`, `CONFLICT`, etc.).
3. Add domain-specific mapping table from rule violation to error code.
4. Define authorization mapping (`UNAUTHORIZED` vs `FORBIDDEN`).
5. Define PII masking behavior in successful responses.

Validation questions:
1. Can frontend handle all errors without special cases?
2. Are sensitive details excluded from response payloads?
3. Are retryable vs non-retryable errors clearly marked?

### 3) Pagination and Filtering
File: `vault/03-API/Pagination-and-Filtering.md`

Mandatory edits:
1. Set global defaults for `page`, `pageSize`, `sortBy`, `sortDir`.
2. Set max `pageSize` and validation behavior.
3. Define approved filters for each module.
4. Define deterministic default sort order for each list endpoint.
5. Add index guidance for common query paths.

Validation questions:
1. Does every list endpoint follow one consistent contract?
2. Are unknown sort/filter fields rejected predictably?
3. Can frontend table components be reused across modules?

### 4) Contribution Reports (or equivalent reporting file)
File: `vault/04-Reports/Contribution-Reports.md`

Mandatory edits:
1. Define report goal and row grain.
2. Mark required vs optional filters.
3. Freeze exact output columns and totals.
4. Define export format and metadata requirements.
5. Define freshness/SLA expectations.

Validation questions:
1. Can QA verify totals deterministically?
2. Are report filters aligned with indexed DB fields?
3. Do exports include enough context for audit/reconciliation?

### 5) ADR-001 Data Immutability and Corrections
File: `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md`

Mandatory edits:
1. State immutable record types explicitly.
2. Define allowed correction mechanism (compensating transaction or equivalent).
3. Define minimum correction metadata.
4. Define phased approval policy (V1 vs hardening).
5. Define rollout triggers for maker-checker or dual control.

Validation questions:
1. Is in-place update/delete blocked for finalized financial records?
2. Can every correction be linked back to original record?
3. Are approval and audit requirements implementable server-side?

## Cross-Template Consistency Rules
1. Role names in Roles-and-Permissions must match role checks in AGENTS implementation checklist.
2. Error codes referenced in Roles-and-Permissions and domain docs must exist in Error Model.
3. Report filters must be supported by Pagination and Filtering contract.
4. ADR correction policy must match API behavior and UI action availability.
5. Open Questions should not block V1 delivery; unresolved items go to ADR/backlog.

## Recommended Update Order
1. `Roles-and-Permissions.md`
2. `Error-Model.md`
3. `Pagination-and-Filtering.md`
4. `Contribution-Reports.md`
5. `ADR-001-Data-Immutability-and-Corrections.md`
6. `AGENTS.md` links and implementation checklist alignment

Reason:
- Role and error policy decisions influence API and UI behavior first.
- Reporting and correction workflow depend on final authorization and error contracts.

## Common Pitfalls
1. Over-designing roles too early.
2. Mixing UI gating with authorization logic.
3. Changing error envelope shape per endpoint.
4. Reporting columns not matching transactional data model.
5. Writing ADRs after implementation instead of before risky behavior.

## Minimal Completion Criteria (Template Adoption)
1. All 5 files exist and are linked from `AGENTS.md`.
2. No `TODO` remains in V1 policy sections.
3. Each file has owner and last-updated date.
4. Quality gates include migration + seed reproducibility.
5. Team can explain auth, errors, reports, and correction flow without ambiguity.

## Reuse Notes
Use this guide for future projects by changing only:
1. Domain vocabulary.
2. Role matrix and compliance constraints.
3. Error mappings and report definitions.

Keep the process, section structure, and decision flow unchanged for speed and consistency.
