# E-Hardening — Module Outline

## Section Purpose
A working prototype and a production system share the same features but differ in one dimension: trust. Hardening is the work that earns that trust — making the system resistant to misuse, auditable when things go wrong, observable when they are going wrong, and fast enough under real load.

This section covers the hardening layer already present in PrismApp. The goal is to understand *why* each piece exists, not just *that* it exists.

---

## Learning Objectives
By the end of this section, learners will be able to:
1. Trace a request from JWT → `getAuthContext` → `requireRole` and explain the 401/403 distinction.
2. Explain why UI-level access gating and server-side role enforcement are both required but serve different purposes.
3. Describe the rate limiting strategy in `proxy.ts` and its known limitation in multi-instance deployments.
4. Explain why audit log writes are placed outside the business transaction.
5. Read a `fromUnknownError` call and predict which HTTP status and error code the client receives.
6. Justify the index choices in `prisma/schema.prisma` by mapping each to a specific query pattern.

---

## Topics

| # | File | Title | Time |
|---|---|---|---|
| 1 | `01-auth-hardening.md` | AuthN vs AuthZ: the two-layer model | 7 min |
| 2 | `02-rate-limiting-and-request-tracing.md` | Rate Limiting and Request Tracing | 7 min |
| 3 | `03-audit-logging.md` | Audit Logging: What to Capture and When | 7 min |
| 4 | `04-error-firewall-and-observability.md` | Error Firewall and Observability | 7 min |
| 5 | `05-database-indexes.md` | Database Indexes: From Slow to Fast | 7 min |
| 6 | `06-hardening-exercise.md` | Exercise: The Hardening Checklist | 5 min |

**Estimated section time:** 40–45 minutes

---

## Key Code References

| File | What it shows |
|---|---|
| `src/lib/authz.ts` | `getAuthContext`, `requireRole`, `requireMutationRole`, `requireAdminRole` |
| `src/lib/user-role.ts` | `MUTATION_ROLES`, `READ_ACCESS_ROLES`, `parseUserRole` |
| `proxy.ts` | Rate limiting, `x-request-id` injection |
| `src/lib/audit-log.ts` | `writeAuditLog`, `AuditEntry` shape |
| `src/lib/api-response.ts` | `fromUnknownError`, `logServerError`, `ok`, `fail`, `HttpError` |
| `sentry.server.config.ts` | Sentry init, `tracesSampleRate` |
| `instrumentation.ts` | `register()`, `onRequestError = Sentry.captureRequestError` |
| `prisma/schema.prisma` | `@@index` declarations across all models |
| `auth.ts` | `authOptions`, `jwt` callback, `session` callback |

---

## Vault References

| Document | Why it matters here |
|---|---|
| `vault/00-Core/Roles-and-Permissions.md` | Role definitions, permission matrix, authorization rules |
| `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md` | Audit trail requirements, correction approval model |
| `vault/03-API/Error-Model.md` | Error envelope shape, error code definitions |

---

## Assessment Questions
1. A request arrives at `GET /api/blocks` with no cookie. What HTTP status does the client receive, and which function throws the error?
2. A request arrives with a valid JWT for a `READ_ONLY` user and calls `POST /api/blocks`. What status does the client receive?
3. You add a new mutation route `POST /api/parking-spaces`. What three things must the route handler do before calling the service?
4. `writeAuditLog` is called after `db.$transaction(...)` resolves, not inside it. Why?
5. A new report filters by `(blockId, createdAt DESC)`. The query is slow. What index is missing, and how do you add it?
