# Section B2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# 04 — The Append-Only Rate Pattern (7 min)

## Slide B-04-1 — Why In-Place Update Destroys the Audit Trail

The Financial Integrity Rules state: rates must be determined at the time of payment, and once applied, the rate must not change even if future rates are updated.

If you store rates with a single amt field and UPDATE it when the MC votes for a new rate, the previous value is gone. Any payment recorded before the update now points to a row showing the new amount, not the amount in effect when payment was made.

This happens silently. The reports show incorrect historical amounts with no error message. You discover it when a resident disputes their payment.

The fix: never UPDATE a rate row. Close the old row by setting toDt to yesterday. Insert a new row with the new amount. The old row is preserved. Every historical payment has an unambiguous rate reference.

*[DEMO: vault/01-Domain/Domain-Rules.md → Financial Integrity Rule 5 (Rate Locking Rule). Read both bullets. Then Contribution Rules 2 — "revised rates are forward effective only."]*

---

## Slide B-04-2 — Closing and Opening: The Two-Write Pattern

When the MC votes to raise the maintenance rate on April 1st, the service executes exactly two writes, atomically in a transaction.

First: UPDATE ContributionRates SET toDt = '2026-03-31' WHERE id = 1. This is the one and only UPDATE ever permitted on a rate row — closing it.

Second: INSERT a new row with amt = 4.00 and fromDt = '2026-04-01', toDt = NULL.

The rate resolution query is deterministic: WHERE contributionHeadId = X AND fromDt <= transactionDt AND (toDt IS NULL OR toDt >= transactionDt). Exactly one row will always match.

Notice: this is the same timeline pattern as UnitOwners. Different domain, identical structure. fromDt + nullable toDt, NULL = current, append only.

*[DEMO: vault/01-Domain/ERD.md → ContributionRates. Then prisma/schema.prisma → ContributionRate model. Then src/modules/contribution-rates/contribution-rates.service.ts → rate resolution query.]*

---

## Slide B-04-3 — Rate-Period Coverage: The Policy That Surprises Developers

A resident pays for January in April. Two rates existed: ₹3.50 in January, ₹4.00 from February.

PrismApp policy: the rate at transactionDateTime applies. The rate in effect when the operator records the payment is the rate that applies. This is documented in Domain-Rules.md as the rate-period coverage policy.

When the resolved rate's fromDt is later than the selected period's start, the API returns a non-blocking warning and the UI shows an amber notice. The contribution is posted normally.

The schema consequence: ContributionDetails has no field for "rate at period start." Only the resolved rate, locked at write time.

*[DEMO: vault/01-Domain/Domain-Rules.md → Contribution Rules 2, rate-period coverage policy bullet. Then src/modules/contributions/contributions.service.ts → the warning logic for late rate application.]*

---

# 05 — The Header + Detail Financial Model (8 min)

## Slide B-05-1 — One Transfer, Multiple Periods

A resident makes a single bank transfer covering three months of maintenance. One transaction reference. One payment date. One person who paid. But three distinct period obligations, each needing independent duplicate protection.

The naive single-row design packs the month list into a string or JSON field. The duplicate check for "has January been paid?" requires parsing that field — not how a DB constraint works.

The naive multi-row design repeats the transaction metadata three times. If you need to correct the reference, you UPDATE three rows. If only two are updated, the data is inconsistent.

Neither works. The correct design separates transaction metadata from per-period entries.

*[DEMO: vault/01-Domain/Domain-Rules.md → Contribution Rules 4 (contributions table). Read the periodCount bullet and the transactionId bullet.]*

---

## Slide B-05-2 — The Split: Header and Detail

Everything the same for all periods — unit, head, who paid, when, transaction reference, quantity — lives on the Contributions (header) row. Stored once.

Everything that varies per period — which month, amount for that month — lives on a ContributionDetails (line) row. Three months = three rows.

The duplicate protection constraint is on the detail row: UNIQUE scope on (unit, head, period). If January has been paid, inserting another detail row for January for the same unit and head violates the constraint.

Amount per period: for a per-sqft head, amt = quantity × applicable_rate. Calculated once at write time. Rate resolved at transactionDateTime. Stored immutably. Never recalculated.

*[DEMO: vault/01-Domain/ERD.md → Contributions then ContributionDetails. Show FK chain: ContributionDetails.contributionId → Contributions.id and ContributionDetails.contributionPeriodId → ContributionPeriods.id. Then prisma/schema.prisma → ContributionDetail model.]*

---

## Slide B-05-3 — The Self-Validating Constraint

The amount distribution rule: SUM(ContributionDetails.amt) WHERE contributionId = X must equal quantity × rate × periodCount.

Every time you write a contribution, you can verify it: sum the detail amounts and compare to the formula. If they disagree, the write logic has a bug.

This is the self-validating property of the header + detail model. The rule is derived from the data, not stored separately. You cannot pass this check by accident.

It is also the basis for the correction model. If a contribution is incorrect, a compensating transaction creates a new header + detail set with negative amounts. Sum of original plus compensating = zero. The correction is visible and auditable.

*[DEMO: vault/01-Domain/Domain-Rules.md → Financial Integrity Rule 4 (Amount Consistency Rule). Read aloud. Then vault/V1/contribution-vision.md → Section C.2 (Compensating Transactions).]*

---

# 06 — Exercise: Design from Rules (7 min)

## Slide B-06-1 — Exercise Setup

New module: Society Event Bookings. Five rules given. Pause and design the tables.

Rule E1: no double booking — one booking per space per date.
Rule E2: booking fees may change year to year; historical bookings must show original fee.
Rule E3: cancellations must be retained.
Rule E4: exactly one resident per booking; resident must be active on booking date.
Rule E5: spaces can be added at any time; not hardcoded.

Before resuming: write (a) how many tables, (b) what rule drives each, (c) which constraints require service logic vs DB constraint.

Classify first: E1 = cardinality overlap; E2 = append-only rate history; E3 = immutability; E4 = FK + eligibility; E5 = user-managed lookup.

*[DEMO: Static. Pause for 2 minutes.]*

---

## Slide B-06-2 — Sample Answer Walkthrough

Four tables: CommonSpaces, SpaceFees, SpaceBookings. No fourth needed in V1.

CommonSpaces from E5: standard user-managed lookup. No special structure.

SpaceFees from E2: if you recognised this as the append-only rate history pattern from topic 4, you solved it in thirty seconds. Same structure as ContributionRates.

SpaceBookings from E1, E3, E4: UNIQUE on (spaceId, bookingDate) WHERE status = Active handles E1. Status field + no DELETE enforces E3. Service check against UnitResidents on bookingDate handles E4.

Notice what we did not build: a separate cancellation table, a booking period table, a booking events log. The rules did not require those. We built exactly what the rules required.

*[DEMO: Show four-table diagram. Point to each rule as you explain its table.]*

---

## Slide B-06-3 — Module Wrap-Up

Five patterns. All derived from rules. All already in PrismApp.

Timeline → UnitOwners. Temporal rule. Service + transaction enforcement.
Calendar as data → ContributionPeriods. Controlled vocabulary rule. Seed + FK enforcement.
Append-only history → ContributionRates. Immutability + temporal. Service enforcement.
Header + detail → Contributions + ContributionDetails. Multi-period event rule. Service enforcement.
System identity → Individuals.isSystemIdentity. Cardinality exclusion rule. Service filter.

The exercise showed a sixth case: these patterns compose. SpaceFees = rate history in a new domain. No new pattern needed.

This is the skill this module aimed to build. Not a set of tables to memorise. A set of rule-type-to-pattern mappings that work across every domain you will encounter.

Open any ERD and ask: what rule produced this table? If nobody can answer, the design has a gap.

*[DEMO: vault/01-Domain/ERD.md → scroll through the full model. Name each table and its rule type. End on the Mermaid diagram at the bottom of the file.]*
