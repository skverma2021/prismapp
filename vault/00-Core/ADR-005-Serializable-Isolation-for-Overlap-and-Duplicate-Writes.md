# ADR-005: Serializable Isolation for Temporal-Overlap and Duplicate-Payment Writes

Status: Accepted
Date: 2026-10-23
Owners: Engineering
Supersedes: the Week 6 "Transaction Isolation Alignment" (all interactive transactions moved from `Serializable` to `ReadCommitted`)

## Context
1. AGENTS.md (section 7) requires overlap prevention and duplicate-payment protection to be enforced "in serializable transaction logic with explicit checks", and the course and videos teach it that way.
2. In Week 6 all 9 interactive transactions were switched to `ReadCommitted`, with the reason "`Serializable` fails on Prisma Postgres cloud adapter" and the assumption that the JavaScript-level checks were sufficient.
3. A check-then-write sequence inside a `ReadCommitted` transaction is not safe: two concurrent transactions can both read "no conflict" and both write. The checks (overlap, duplicate payment) are exactly this pattern, and no database unique constraint backs them.
4. The cloud-adapter problem was re-tested on 2026-10-23 with the current stack (Prisma 7 + `@prisma/adapter-pg`, SSL connection from `DATABASE_URL`): `Serializable` interactive transactions run and report `transaction_isolation = serializable`.
5. Measured on the real database with two concurrent check-then-insert transactions:
   - `ReadCommitted`: both inserted (2 rows, i.e. the duplicate).
   - `Serializable`: one inserted, the other was aborted with SQLSTATE 40001.

## Decision
1. These transactions run at `Serializable`:
   - ownership create and transfer
   - residency create and update
   - contribution rate create and update (rate-range overlap)
   - contribution create (duplicate-payment check)
   - contribution correction create (remaining-correctable-amount check, ADR-004)
2. They use the shared helper `runSerializable` in `src/lib/db.ts`. It runs the callback at `Serializable` and retries the whole unit of work up to 3 times, with a short randomised backoff, when PostgreSQL aborts it for a serialization conflict. Domain errors (`HttpError`) are never retried. On the retry the checks run again, so the loser of a race sees the winner's row and fails with the normal domain error (409/412).
3. If conflicts persist after the last attempt, the API answers `503 SERVICE_UNAVAILABLE` with `retryable: true`. Under Prisma 7 with the pg adapter a conflict surfaces either as P2034 or as a driver-adapter error (cause kind `TransactionWriteConflict`, SQLSTATE 40001); `isSerializationConflict` in `src/lib/serialization.ts` recognises both, and `fromUnknownError` maps them.
4. `createUnit` stays at `ReadCommitted`: it runs no overlap or duplicate check (the unit uniqueness is a database constraint) and the new unit has no earlier ownership rows to conflict with.
5. Audit-log writes stay outside the transaction (ADR-001 note), so a retry never duplicates an audit entry.

## Why
1. It closes the race the domain rules depend on, without new schema constraints or locking code.
2. The overlap rules are temporal; PostgreSQL exclusion constraints would need extra schema and extensions (see the ownership design notes). Serializable is the simplest correct option now.
3. Retrying inside the service keeps ordinary users from seeing transient 503s for a conflict they cannot act on.

## Consequences
### Positive
- Concurrent conflicting ownership, residency, rate and payment writes can no longer both succeed (verified by concurrent API checks in `scripts/test-contributions-api.mjs`).
- Documentation, course and videos that describe serializable transactions are now accurate.

### Trade-offs
- Serializable can abort valid transactions under contention; the retry hides most of this at the cost of a few extra milliseconds on conflicts.
- A transaction callback may now run more than once. Callbacks must contain only database work (no external side effects). All current callbacks satisfy this.
- Under sustained heavy contention a request can still return 503; clients should retry as the error envelope states.

## Alternatives Considered
1. Keep `ReadCommitted` and rely on application checks: rejected; it allows the race shown above.
2. Database exclusion constraints or a unique constraint on unit + head + period: possible future hardening; needs schema changes and, for ranges, the btree_gist extension.
3. Advisory locks per unit: workable, but more custom code than a standard isolation level.

## Follow-up
1. Consider a unique or exclusion constraint as defence in depth for duplicate payments and overlapping ranges.
2. Revisit if a deployment target again rejects `Serializable`.
