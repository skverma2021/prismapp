# Module Outline — B2: From Domain Rules to ERD (Part 2 — Rate History, Header-Detail, Exercise)

> **This is Part 2 of Section B.** Part 1 is in [`../B1-erd/00-module-outline.md`](../B1-erd/00-module-outline.md).
> Read Part 1 first for prerequisites and the full learning-objectives list.

## Identity

| Field | Value |
|---|---|
| Section | B2 — From Domain Rules to ERD (Part 2 of 2) |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | B1 — ERD Part 1 (Rules to Tables + Temporal Ownership + Calendar as Controlled Vocabulary) |
| Estimated duration | 22–25 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives (Part 2)

By the end of this part, the student will be able to:

1. Apply the append-only rate history pattern and describe how rate locking is a schema decision, not just a service decision.
2. Decompose a financial recording scenario into a header + detail table structure and verify it against the amount distribution constraint.
3. Design a schema from a set of business rules and map each constraint back to its rule source.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 4 | `04-rate-history.md` | The Append-Only Rate Pattern | 7 min |
| 5 | `05-header-detail-pattern.md` | The Header + Detail Financial Model | 8 min |
| 6 | `06-erd-reading-exercise.md` | Exercise: Design from Rules | 7 min |

---

## Key Takeaways (Part 2)

1. Append-only rate history is what makes historical payment reconstruction possible; in-place rate updates silently destroy the audit trail.
2. The header + detail split is forced by two independent requirements: one transaction can span multiple periods, and each period's amount must be independently lockable and independently identifiable for duplicate protection.
3. Every schema decision can be traced back to a named domain rule — there are no arbitrary design choices in a well-designed system.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/01-Domain/Domain-Rules.md` | 4, 5 | Financial Integrity Rules; Contribution Rules 1–5 |
| `vault/01-Domain/ERD.md` | 4, 5 | ContributionRates, Contributions, ContributionDetails |
| `vault/V1/contribution-vision.md` | 4, 5 | Section B (Payment Capture), Section C (Financial Immutability) |
| `prisma/schema.prisma` | 4, 5 | ContributionRates model, Contributions + ContributionDetails models |

## Code References

| File | Used in topic # | What to show |
|---|---|---|
| `prisma/schema.prisma` | 4, 5 | `ContributionRate` model; `Contribution` + `ContributionDetail` models; rate lock fields |
| `src/modules/contributions/contributions.service.ts` | 5 | Header + detail multi-row write; rate lock at payment time |

---

## Assessment / Discussion Questions

1. A society MC votes to raise the maintenance rate from ₹3.50/sq ft to ₹4.00/sq ft in April. What rows must be written in `ContributionRates`? Must any existing row be modified?
2. A resident makes a single UPI payment for maintenance covering January, February, and March. Draw the rows written in `Contributions` and `ContributionDetails`. How many total rows?
3. Why can a contribution record not be corrected in-place once posted? What mechanism must be used instead?
4. *Stretch:* Why is `periodCount` a stored field on `Contributions` rather than a computed `COUNT(*)` on `ContributionDetails`? What are the trade-offs?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `prisma/schema.prisma` (ContributionRates, Contributions models); `src/modules/contributions/contributions.service.ts` |
| Diagrams needed | Rate timeline diagram (topic 4); header+detail row diagram (topic 5); CMM schema table diagram (exercise) |
| Talking-head segments | Intro to Part 2 (30s); wrap-up for full Section B (90s) |

---
