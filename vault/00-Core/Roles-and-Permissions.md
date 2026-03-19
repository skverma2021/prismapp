# Roles and Permissions

Status: Draft (V1)
Owner: Product + Engineering
Last Updated: 2026-03-19

## Purpose
Define who can do what in the system for the current scope.

This file is intentionally lightweight and reusable. Keep this document stable and move edge cases into ADRs.

## Roles (V1)

Note: Owners and residents are domain entities (payers), not staff access roles by default.

### 1) Society Admin
- Full access to master data and contribution modules.
- Can create/update blocks, units, individuals.
- Can assign ownership and residency timelines.
- Can record contributions.
- Can view all reports.
- Can create compensating transactions for corrections.
- Can manage user role assignments.

### 2) Manager
- Operational access without platform-level administration.
- Can manage units, individuals, ownership, and residency.
- Can record contributions.
- Can view all reports.
- Cannot change role assignments.
- Cannot perform destructive operations on financial records.

### 3) Read-Only
- View-only access to master data and reports.
- Cannot create/update/delete any record.

## Payment Actor Model (V1)
1. Owners and residents can make payments as payers.
2. A payer does not need to be a Manager/Admin role to pay.
3. The `depositedBy` field must reference a valid Individual (owner, resident, or any registered individual).
4. Platform write access remains role-based (Society Admin or Manager) unless a future self-service payer portal is introduced.

## Payment Capture Flow (V1)
1. Payer completes payment via UPI or bank transfer outside the app.
2. Payer shares transaction reference (transactionId, date/time, head, period, amount context) with a Manager/Admin.
3. Manager/Admin records the contribution in the system.
4. System validates domain constraints (duplicate prevention, period constraints, rate locking, immutability).
5. Stored record keeps payer identity in `depositedBy` and operator identity in audit fields (`actorUserId`, `actorRole`).

Future option:
- Add payer self-service submission where payer can submit proof and details directly, subject to review/verification workflow.

## Permission Matrix (V1)

| Capability                      | Society Admin | Manager | Read-Only |
| ------------------------------- | ------------- | ------- | --------- |
| View blocks/units/individuals   | Yes           | Yes     | Yes       |
| Create/update blocks/units      | Yes           | Yes     | No        |
| Create/update individuals       | Yes           | Yes     | No        |
| Manage ownership timeline       | Yes           | Yes     | No        |
| Manage residency timeline       | Yes           | Yes     | No        |
| Record contribution payment     | Yes           | Yes     | No        |
| Create compensating transaction | Yes           | Yes     | No        |
| Edit posted contribution        | No            | No      | No        |
| Delete posted contribution      | No            | No      | No        |
| View contribution reports       | Yes           | Yes     | Yes       |
| Manage user roles               | Yes           | No      | No        |

## Authorization Rules
1. Authorization is enforced server-side only.
2. UI visibility does not replace server authorization.
3. Financial immutability rules are role-independent (nobody can directly edit or delete posted contributions).
4. All denied operations must return a standard authorization error (see `vault/03-API/Error-Model.md`).

### Authorization Rule Explanations
- Server-side enforcement means all permission checks happen in Server Actions/Route Handlers/domain services before any mutation.
- UI restrictions are convenience only; backend checks must still reject unauthorized requests even if someone calls APIs directly.
- Every protected operation should verify both identity (who is calling) and permission (what role can do this action).
- Authorization failures should be auditable (actor, action, target entity, timestamp, reason).

## Identity and Session Assumptions (V1)
1. Every mutation request must carry authenticated user context.
2. User identity maps to one and only one role for V1.
3. Multi-role users can be added later if needed.

## Audit Requirements (V1)
For every mutation, store at least:
- actorUserId
- actorRole
- action
- entityType
- entityId
- timestamp
- requestId (if available)

## Open Questions
1. Will there be role scoping by block, or global roles only?
2. Is maker-checker approval needed for financial corrections?
3. Should read-only users see personally identifiable fields by default?

## Recommended V1 Decisions
1. Role scope: global roles only for V1 to keep implementation simple; revisit block-level scoping when delegated operations increase.
2. Maker-checker: not mandatory for V1, but required for high-risk correction scenarios in a later hardening phase.
3. PII for read-only: mask sensitive fields (mobile/email) by default and allow full visibility only for Manager/Admin.

## Reusable Template Notes
For other projects, keep this structure and only change:
- role names
- capability matrix
- audit fields
- scope and approval model
