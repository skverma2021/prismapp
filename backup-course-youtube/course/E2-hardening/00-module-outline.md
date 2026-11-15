# Module Outline — E2: Hardening (Part 2 — Observability, Indexes, Exercise)

> **This is Part 2 of Section E.** Part 1 is in [`../E1-hardening/00-module-outline.md`](../E1-hardening/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | E2 — Hardening (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | E1 — Hardening Part 1 (AuthN + AuthZ + Rate Limiting + Audit Logging) |
| Estimated duration | 19–22 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Read a `fromUnknownError` call and predict which HTTP status and error code the client receives.
2. Describe the observability stack (Sentry + request tracing) and explain what it adds beyond console.log.
3. Justify the index choices in `prisma/schema.prisma` by mapping each index to a specific query pattern.
4. Apply the hardening checklist to a new module to determine what is missing.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 4 | `04-error-firewall-and-observability.md` | Error Firewall and Observability | 7 min |
| 5 | `05-database-indexes.md` | Database Indexes: From Slow to Fast | 7 min |
| 6 | `06-hardening-exercise.md` | Exercise: The Hardening Checklist | 5 min |

---

## Key Takeaways (Part 2)

1. `fromUnknownError` is the single funnel for all unhandled errors in route handlers. Its job is to map any thrown value to a safe, predictable HTTP response without leaking internal details.
2. Sentry `captureRequestError` and `x-request-id` together give you two things console.log cannot: correlation across services and reproduction data from production.
3. Every `@@index` in the schema was added because a specific report or list query was slow without it — not speculatively. Map index to query before adding any new index.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/03-API/Error-Model.md` | 4 | Error envelope shape, error code definitions |
| `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md` | 4 | Audit trail requirements |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `src/lib/api-response.ts` | 4 | `fromUnknownError`, `logServerError`, `ok`, `fail`, `HttpError` |
| `sentry.server.config.ts` | 4 | Sentry init, `tracesSampleRate` |
| `instrumentation.ts` | 4 | `register()`, `onRequestError = Sentry.captureRequestError` |
| `proxy.ts` | 4 | `x-request-id` injection |
| `prisma/schema.prisma` | 5 | `@@index` declarations across all models |

---

## Assessment / Discussion Questions

1. A new mutation route `POST /api/parking-spaces` is added. What three things must it do before calling the service?
2. A new report filters by `(blockId, createdAt DESC)`. The query is slow. What index is missing? How do you add it?
3. A `fromUnknownError` call receives a plain JS `Error`. What HTTP status does the client receive?
4. *Stretch:* `writeAuditLog` is called after `db.$transaction(...)` resolves, not inside it. Why? What is the consequence if the audit log write fails?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `src/lib/api-response.ts` (`fromUnknownError`); `prisma/schema.prisma` (indexes section); `sentry.server.config.ts` |
| Diagrams needed | Error firewall flow diagram (topic 4) |
| Talking-head segments | Intro to Part 2 (30s); wrap-up for full Section E (90s) |

---
