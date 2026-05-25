# Module Outline — B: From Domain Rules to ERD

## Identity

| Field | Value |
|---|---|
| Section | B — From Domain Rules to ERD |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Section A (Defining Scope); basic SQL (tables, FK, UNIQUE constraints) |
| Estimated duration | 40–45 minutes |
| Companion project | PrismApp — Society Management System |

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Classify a domain rule by which type of schema implication it carries.
2. Explain when a simple foreign key is insufficient and a temporal (timeline) model is needed.
3. Design a pre-seeded lookup table from a domain constraint and explain why it is safer than free-form input.
4. Apply the append-only rate history pattern and describe how rate locking is a schema decision, not just a service decision.
5. Decompose a financial recording scenario into a header + detail table structure and verify it using the amount distribution constraint.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-rules-to-tables.md` | From Rules to Tables — A Decision Framework | 6 min |
| 2 | `02-temporal-ownership.md` | When a Foreign Key Is Not Enough | 7 min |
| 3 | `03-calendar-as-data.md` | Calendar as Controlled Vocabulary | 7 min |
| 4 | `04-rate-history.md` | The Append-Only Rate Pattern | 7 min |
| 5 | `05-header-detail-pattern.md` | The Header + Detail Financial Model | 8 min |
| 6 | `06-erd-reading-exercise.md` | Exercise: Design from Rules | 7 min |

---

## Key Takeaways

1. Every table design decision in this project can be traced back to a specific domain rule — there are no arbitrary design choices.
2. Overlap constraints on time periods cannot be expressed as a database UNIQUE constraint; they require a range check in service code inside a transaction.
3. Pre-seeding periods as rows converts a runtime validation problem into a JOIN — simpler, faster, and provably correct.
4. Append-only rate history is what makes historical payment reconstruction possible; in-place rate updates silently destroy the audit trail.
5. The header + detail split is forced by two independent requirements: one transaction can span multiple periods, and each period's amount must be independently lockable and independently identifiable for duplicate protection.

---

## Vault References

| Vault file | Used in topic # | What to show |
|---|---|---|
| `vault/01-Domain/Domain-Rules.md` | 1, 2, 3, 4, 5 | O3–O8 (ownership rules); Contribution Rules 1–5; Financial Integrity Rules; Quantity Rules |
| `vault/01-Domain/ERD.md` | 2, 3, 4, 5 | UnitOwners, ContributionPeriods, ContributionRates, Contributions, ContributionDetails |
| `vault/V1/master-data-vision.md` | 2 | Section C — Why Timelines, Not Just Foreign Keys |
| `vault/V1/contribution-vision.md` | 3, 4, 5 | Section A (Charge Structure), Section B (Payment Capture), Section C (Financial Immutability) |
| `prisma/schema.prisma` | 2, 3, 4, 5 | UnitOwners model, ContributionPeriods model, ContributionRates model, Contributions + ContributionDetails models |
| `prisma/seed.mjs` | 3 | `seedContributionPeriods()` — show 13 rows per year |

---

## Assessment / Discussion Questions

1. Name four types of domain rule and give one example of each from `vault/01-Domain/Domain-Rules.md`.
2. Why can the rule "a unit cannot have two active owners at the same time" not be enforced by a UNIQUE database constraint? What must enforce it instead?
3. What are the two problems with letting an operator type a free-form date for a contribution period? How does pre-seeding solve both?
4. A society MC votes to raise the maintenance rate from ₹3.50/sq ft to ₹4.00/sq ft in April. What rows must be written in `ContributionRates`? Must any existing row be modified?
5. A resident makes a single UPI payment for maintenance covering January, February, and March. Draw the rows that will be written in `Contributions` and `ContributionDetails`. How many total rows?
6. *(Stretch)* Why is `periodCount` a stored field on `Contributions` rather than a computed `COUNT(*)` on `ContributionDetails`? What are the trade-offs?

---

## Production Notes

| Item | Note |
|---|---|
| Screen recordings needed | `vault/01-Domain/Domain-Rules.md`; `vault/01-Domain/ERD.md`; `prisma/schema.prisma`; `prisma/seed.mjs`; `src/modules/contributions/contributions.service.ts` |
| Diagrams needed | Decision matrix slide 1 (table); FK vs timeline comparison diagram (topic 2); ContributionPeriods row grid 13×1 (topic 3); rate timeline diagram (topic 4); header+detail row diagram (topic 5) |
| Talking-head segments | Intro (30s), transition between topics 2 and 3, module wrap-up |
| B-roll | Whiteboard sketch of naive vs timeline design for topic 2 |

---

## Status

- [ ] Slide scripts drafted (01–06)
- [ ] Speaker notes assembled (slides/B-erd-notes.md)
- [ ] Diagrams created
- [ ] PPT built
- [ ] Camtasia recorded
- [ ] Review pass complete
