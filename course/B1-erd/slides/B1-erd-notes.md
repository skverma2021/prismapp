# Section B1 - Speaker Notes (Part 1)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# Section B — Speaker Notes (Assembled)
# For: B-erd.pptx | Camtasia session B

<!--
  This file is the single source of truth for PPT notes-panel text
  and Camtasia narration. Copy each slide's narration block into
  the corresponding PPT slide notes panel before recording.
  Sections are numbered to match slide groups (01–06).
-->

---

# 01 — From Rules to Tables: A Decision Framework (6 min)
## Slide B-01-1 — Every Table Decision Has a Rule Behind It

In Section A we said that domain rules shape not just your service logic but your schema. In this module we are going to prove that claim with five concrete tables from PrismApp.

Before we look at specific tables, we need a decision framework. Not every domain rule leads to the same schema structure. There are four rule types that appear repeatedly in this project, and each one leads to a different table design pattern.

Cardinality rules — "exactly one," "at most one," "zero or more" — lead to foreign keys or join tables. These are the rules most developers already know how to handle.

Temporal rules — "at any given time," "once recorded," "from this date" — require you to model time explicitly in the data, not just in service logic. A foreign key alone cannot represent a time-bounded relationship.

Immutability rules — "cannot be modified after," "must not change" — lead to append-only patterns. The instinct to reach for an UPDATE statement is exactly wrong.

Controlled vocabulary rules — constraints on valid values to a finite, pre-defined set — lead to lookup tables. When that vocabulary also has business constraints attached, the lookup table may be pre-seeded rather than user-managed.

*[DEMO: Open vault/01-Domain/Domain-Rules.md. Scroll slowly through headings: Ownership Rules, Temporal Integrity Rules, Financial Integrity Rules, Contribution Period Constraints. Name the rule type each heading represents.]*

---

## Slide B-01-2 — The Decision Matrix

Here is the matrix. Print it. Keep it next to your schema editor.

The signal words are your cues. "At any given time" signals a temporal rule. "Cannot be modified after creation" signals an immutability rule. "Must be one of" signals a controlled vocabulary rule.

One important note: these rule types are not mutually exclusive. A single table can be both temporal and immutable. `ContributionRates` is exactly that — it models a time-bounded rate (temporal) that cannot be modified once set (immutable). That double classification is what forces the append-only design, which we will see in topic 4.

*[DEMO: Static slide. Point to each row naming signal words. Pause on row 4 and circle ContributionPeriods — this is the one that surprises most students.]*

---

## Slide B-01-3 — Reading the Rules: A Quick Classification Pass

Let us do this live. Open vault/01-Domain/Domain-Rules.md and classify five rules in real time.

O3: "A Unit cannot have more than one active owner at any given time." — Temporal. "At any given time" is the signal.

O7: "Ownership periods for a Unit must not have gaps." — Temporal with a continuity constraint. A gapless check must run on every write.

Financial Integrity 1: "Contributions are immutable once recorded." — Immutability. This one word closes the door on UPDATE and DELETE.

Financial Integrity 5: "Contribution rate must be determined at the time of payment." — Immutability. The resolved rate must be persisted at write time.

Contribution Period Constraints 1: "Payments can only be made for periods within the current year." — Controlled vocabulary. "Within the current year" means the valid values are a finite set that should be stored as rows, not computed at runtime.

Five rules, five minutes, five design decisions already made.

*[DEMO: vault/01-Domain/Domain-Rules.md → O3, O7, Financial Integrity 1 and 5, Contribution Period Constraints 1. Read each rule and state its type.]*

---

# 02 — When a Foreign Key Is Not Enough (7 min)

## Slide B-02-1 — The Naive Design and Why It Fails

When you first encounter "track who owns each flat," the obvious design is a `currentOwnerId` column on the Units table. It is a single column, it is a FK, it has a clear name.

It answers exactly one question: who owns this flat right now?

Now look at rule O2: "An individual may own the same unit multiple times across different time periods." Rule O5: "Ownership continuity starts on inceptionDt." These rules require reconstructing the full ownership history, not just the current state.

The naive design cannot do this. When a flat changes hands, you UPDATE the column. The previous owner is gone. The history is destroyed. The symptom appears late — usually when someone needs a historical report and there is no data to support it.

*[DEMO: vault/V1/master-data-vision.md → Section C.3 "Why Timelines, Not Just Foreign Keys." Read the first two sentences aloud.]*

---

## Slide B-02-2 — The Timeline Pattern and the Day-Zero Problem

Before we go further, look at the first row of the ownership table. The owner is BUILDER_INVENTORY. What is that?

Rule O4 says a unit must always have exactly one active owner — not usually, not once it is sold — always. Including from the moment it enters the system on inceptionDt.

But on inceptionDt, no real buyer exists. The flat has just been registered into the system. It may not even have been marketed yet. If we take O4 seriously, we need an owner from day zero.

BUILDER_INVENTORY is the system identity that fills this requirement. It is not a real person. It is the system's representation of the builder's de facto possession before any sale. When the first real buyer purchases the flat, the ownership transfer closes the BUILDER_INVENTORY row and opens a new row for that buyer. Unit creation and first-ownership-row creation are a single atomic operation — so no unit ever enters the database without an owner.

The ownership chain is unbroken from inceptionDt — not because the data happens to be clean, but because the system enforces it structurally.

Now look at the residency table. Between July and August 2022, Ravi Kumar owns the flat but no one lives there. The unit is vacant. That is perfectly fine.

This is the distinction that trips up many developers: vacancy is a residency state, not an ownership state. O4 says there must always be exactly one owner. R4 explicitly says a unit may have zero or one active resident. The two chains are independent. A vacant unit has an owner — it is just that no one is currently living there.

*[DEMO: vault/01-Domain/Domain-Rules.md → O4 (read aloud) → O6 (read aloud, show the connection). Then vault/01-Domain/ERD.md → UnitOwners. Then prisma/schema.prisma → UnitOwners model and the Unit create logic showing the atomic first-row creation.]*

---

## Slide B-02-3 — Why the Overlap Check Cannot Be a Constraint

A UNIQUE constraint checks for exact duplicate column values — not for ranges that overlap. Two rows with different fromDt values pass the UNIQUE check even if their date ranges overlap completely.

PostgreSQL has range types and exclusion constraints, but they add schema complexity. For this project, enforcement lives in the service layer inside a serializable transaction. The check runs before the write. If overlapping rows are found, the write is rejected.

This is correct separation of concerns. The schema enforces what schemas can enforce. The service enforces what requires business logic.

*[DEMO: src/modules/ownerships/ownerships.service.ts → createOwnership or transferOwnership. Point to the overlap-check query and the transaction wrapper.]*

---

# 03 — Calendar as Controlled Vocabulary (7 min)

## Slide B-03-1 — The Problem with Free-Form Date Entry

The domain rule says: "Payments can only be made for periods within the current year." This sounds simple. But what is the data type of a "period"? Not a date. Not a string. It is a calendar slot.

If you let the operator type a period as free text, you get "January 2026" in one record and "Jan 26" in the next. Your duplicate check query now depends on normalising that string. What started as a business rule is now a string-matching problem.

If you use month + year dropdowns, you need to calculate "is this combination within the current year?" in every endpoint that accepts a period.

The better solution: define every valid period as a row in a table. The operator selects a row. The duplicate check is WHERE unitId = X AND headId = Y AND periodId = Z — an indexed integer comparison.

*[DEMO: vault/01-Domain/Domain-Rules.md → Contribution Period Constraints rule 1, then Contribution Rules point 3 about contributionPeriods.]*

---

## Slide B-03-2 — The Pre-Seeded Period Table

The ContributionPeriods table has two working columns: refYear and refMonth.

refMonth = 0 is the full-year row. It exists for contribution heads billed annually. When an operator selects a yearly head and pays for 2026, they pick the row where refYear = 2026 and refMonth = 0.

Monthly heads use rows 1 through 12. If a resident pays January and February in one transaction, they pick row 146 and row 147.

The domain rule "yearly contributions must use refMonth = 0" becomes: IF head.period = 'yearly' THEN periodId.refMonth MUST equal 0. One line of service code, not a date parser.

This table is seeded, not user-managed. When a new year begins, the seed script runs once and adds 13 rows.

*[DEMO: prisma/seed.mjs → seedContributionPeriods(). Show the loop. Then vault/01-Domain/ERD.md → ContributionPeriods — three fields only.]*

---

## Slide B-03-3 — How Seeding Turns Validation into a JOIN

With free-form dates, every endpoint must: parse, normalise, calculate current-year membership, build a period identifier, run a duplicate check on a string. Every step is a potential bug.

With pre-seeded periods: API receives an integer periodId. FK check confirms the row exists. Single field comparison (periodId.refYear = currentYear) replaces the date calculation. Duplicate check is an indexed FK comparison.

The pre-seeding did not add complexity. It moved complexity from repeated runtime logic to a one-time data setup.

*[DEMO: src/modules/contributions/contributions.service.ts → period validation logic. Show the single refYear comparison replacing a date parsing function.]*

---