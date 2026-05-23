# Slide Script — B-03: Calendar as Controlled Vocabulary

---

## Slide 1 — The Problem with Free-Form Date Entry

**Type:** `Concept`

**Headline:**
> "Enter the payment month" is a specification problem disguised as a UI problem.

**Visual / layout:**
Three UI mockups side by side, all showing the same field labelled "Payment period":
1. A text input showing "January 2026"
2. A text input showing "Jan 26"
3. Two dropdowns: Month (January) + Year (2026)

Below all three: a red label "Same meaning. Three representations. How does the duplicate check work?" and a fourth mockup showing a dropdown pointing to a pre-seeded row "January 2026 (id: 147)" with a green label "One row. One FK. One UNIQUE constraint."

**Narration:**
The domain rule says: "Payments can only be made for periods within the current year." This sounds simple.

Now ask yourself: what is the data type of a "period"? It is not a date — a payment for January covers the whole month, not a single day. It is not a timestamp. It is not a string. It is a calendar slot: a month within a year, or a full year.

If you let the operator enter this as free text, you get "January 2026" in one record and "Jan 26" in the next. Your duplicate protection query `WHERE unit=X AND head=Y AND period=Z` now depends on normalising that string. What started as a business rule is now a string-matching problem.

If you use month + year dropdowns, you need to calculate "is this combination within the current year?" at runtime, in every API endpoint that accepts a period.

The better solution: define every valid period as a row in a table. The operator selects a row. The duplicate check is `WHERE unitId = X AND headId = Y AND periodId = Z` — an indexed integer comparison. Simple, fast, and provably correct.

**On-screen action / demo:**
Open `vault/01-Domain/Domain-Rules.md`. Navigate to Contribution Period Constraints. Read rule 1 aloud. Then navigate to Contribution Rules point 3 about `contributionPeriods`. Read the description of the 13-row structure.

**Key takeaway:**
When a domain constraint restricts valid values to a finite, well-defined set, the safe design is a lookup table — not a validation function.

---

## Slide 2 — The Pre-Seeded Period Table

**Type:** `Diagram`

**Headline:**
> 13 rows per year: refMonth = 0 for the full year, 1–12 for each month.

**Visual / layout:**
A small table showing sample data for year 2026:

| id | refYear | refMonth | label (derived) |
|---|---|---|---|
| 145 | 2026 | 0 | Year 2026 (annual) |
| 146 | 2026 | 1 | January 2026 |
| 147 | 2026 | 2 | February 2026 |
| ... | ... | ... | ... |
| 157 | 2026 | 12 | December 2026 |

A callout box beside `refMonth = 0`: "Annual heads use this row. Monthly heads use rows 1–12. One table serves both."

**Narration:**
Here is the table: `ContributionPeriods`. Two columns do all the work: `refYear` and `refMonth`.

The `refMonth = 0` row represents the full year. It exists for contribution heads that are billed annually — a gym membership for the whole year, a common hall booking fee. When the operator selects a yearly head and wants to pay for 2026, they pick the row where `refYear = 2026` and `refMonth = 0`.

Monthly heads use rows 1 through 12. If a resident pays maintenance for January and February in one transaction, they pick row 146 and row 147.

The domain rule "yearly contributions must use refMonth = 0" is now a simple validation: `IF head.period = 'yearly' THEN periodId.refMonth MUST equal 0`. One line of service code, not a date parsing algorithm.

This table is seeded, not user-managed. When a new year begins, the seed script runs once and adds 13 new rows. Operators cannot add, delete, or modify period rows.

**On-screen action / demo:**
Open `prisma/seed.mjs`. Navigate to `seedContributionPeriods()`. Read the loop structure — show how 13 rows are created per year. Then open `vault/01-Domain/ERD.md` → ContributionPeriods table. Show that it has only three fields: id, refYear, refMonth.

**Key takeaway:**
The `refMonth = 0` encoding is the key design decision: it unifies annual and monthly periods in one table, making head-period validation uniform.

---

## Slide 3 — How Seeding Turns Validation into a JOIN

**Type:** `Diagram`

**Headline:**
> A pre-seeded row converts a runtime calculation into a foreign key lookup.

**Visual / layout:**
Two process flowcharts stacked vertically.

Top (labelled "Free-form date approach"):
Operator enters month+year → API receives strings → Parse and normalise → Calculate if within current year → Build period identifier → Run duplicate check on computed string → Risk of inconsistency at every step.

Bottom (labelled "Pre-seeded period approach"):
Operator selects row from dropdown → API receives periodId (integer) → FK validates the row exists → `periodId.refYear = currentYear` check → Duplicate check on FK integer → No string parsing, no normalisation.

**Narration:**
Here is the before and after at the API level.

With free-form dates, every endpoint that accepts a payment period must: parse the input, normalise it to a canonical form, calculate whether it falls in the current year, and then construct a duplicate-check query using that normalised form. Every one of those steps is a potential bug. And if two endpoints normalise differently — say one trims whitespace and the other does not — your duplicate protection silently breaks.

With pre-seeded periods, the operator selects a dropdown item. The API receives an integer. A FK check confirms the row exists. A single field comparison (`periodId.refYear = currentYear`) replaces the date calculation. The duplicate check is an indexed integer comparison.

The pre-seeding did not add complexity — it moved the complexity from runtime to seed time, where it runs once, in a controlled environment, with tests.

**On-screen action / demo:**
Open `src/modules/contributions/contributions.service.ts`. Find the period validation logic — the check that confirms the selected period belongs to the current year. Show that it is a single comparison against the period row's `refYear` field, not a date parsing function.

**Key takeaway:**
Pre-seeding moves validation from repeated runtime logic to a one-time data setup. The duplicate check becomes an indexed FK comparison — which is the simplest and most reliable form of constraint enforcement.

---

## Transition note

Controlled vocabulary turned a validation problem into a JOIN. Next: immutability rules and what they demand from a rate table.
