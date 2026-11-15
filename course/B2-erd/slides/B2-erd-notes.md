# Section B2 - Speaker Notes (Part 2)
<!--
  Speaker notes file. Copy narration into Camtasia or PPT notes panel before recording.
-->

---

# 04 — The Append-Only Rate Pattern (7 min)

## Slide B-04-1 — Why In-Place Update Destroys the Audit Trail

The Financial Integrity Rules state two things. Rates must be determined at the time of payment. And once applied, the rate must not change, even if future rates are updated.

Suppose you store rates with a single amt field. Then the MC votes for a new rate, and you UPDATE it. The previous value is gone.

Any payment recorded before the update now points to a row showing the new amount. It does not show the amount in effect when the payment was made.

This happens silently. The reports show incorrect historical amounts with no error message. You discover it when a resident disputes their payment.

The fix is to never UPDATE a rate row. Close the old row by setting toDt to yesterday. Insert a new row with the new amount.

The old row is preserved. Every historical payment has an unambiguous rate reference.

*[DEMO: vault/01-Domain/Domain-Rules.md → Financial Integrity Rule 5 (Rate Locking Rule). Read both bullets. Then Contribution Rules 2 — "revised rates are forward effective only."]*

---

## Slide B-04-2 — Closing and Opening: The Two-Write Pattern

The MC votes to raise the maintenance rate on April 1st. The service then executes exactly two writes, atomically in a transaction.

First, UPDATE ContributionRates SET toDt = '2026-03-31' WHERE id = 1. This is the one and only UPDATE ever permitted on a rate row. It closes the row.

Second, INSERT a new row with amt = 4.00 and fromDt = '2026-04-01', toDt = NULL.

The rate resolution query is deterministic. It reads: WHERE contributionHeadId = X AND fromDt <= transactionDt AND (toDt IS NULL OR toDt >= transactionDt).

Exactly one row will always match.

Notice that this is the same timeline pattern as UnitOwners. The domain is different, but the structure is identical. It uses fromDt and a nullable toDt. NULL means current. And the table is append only.

*[DEMO: vault/01-Domain/ERD.md → ContributionRates. Then prisma/schema.prisma → ContributionRate model. Then src/modules/contribution-rates/contribution-rates.service.ts → rate resolution query.]*

---

## Slide B-04-3 — Rate-Period Coverage: The Policy That Surprises Developers

A resident pays for January in April. Two rates existed. ₹3.50 applied in January. ₹4.00 applied from February.

PrismApp policy says the rate at transactionDateTime applies. The rate in effect when the operator records the payment is the rate that applies.

This is documented in Domain-Rules.md as the rate-period coverage policy.

Sometimes the resolved rate's fromDt is later than the selected period's start. Then the API returns a non-blocking warning, and the UI shows an amber notice. The contribution is posted normally.

There is a schema consequence. ContributionDetails has no field for "rate at period start." It has only the resolved rate, locked at write time.

*[DEMO: vault/01-Domain/Domain-Rules.md → Contribution Rules 2, rate-period coverage policy bullet. Then src/modules/contributions/contributions.service.ts → the warning logic for late rate application.]*

---

# 05 — The Header + Detail Financial Model (8 min)

## Slide B-05-1 — One Transfer, Multiple Periods

A resident makes a single bank transfer covering three months of maintenance. There is one transaction reference. There is one payment date. One person paid.

But there are three distinct period obligations. Each one needs independent duplicate protection.

The naive single-row design packs the month list into a string or JSON field. The duplicate check for "has January been paid?" then requires parsing that field. That is not how a DB constraint works.

The naive multi-row design repeats the transaction metadata three times. Suppose you need to correct the reference. You UPDATE three rows. If only two are updated, the data is inconsistent.

Neither works. The correct design separates transaction metadata from per-period entries.

*[DEMO: vault/01-Domain/Domain-Rules.md → Contribution Rules 4 (contributions table). Read the periodCount bullet and the transactionId bullet.]*

---

## Slide B-05-2 — The Split: Header and Detail

Everything the same for all periods lives on the Contributions (header) row. That means unit, head, who paid, when, transaction reference, and quantity. It is stored once.

Everything that varies per period lives on a ContributionDetails (line) row. That means which month, and the amount for that month. Three months means three rows.

The duplicate protection constraint is on the detail row. It is a UNIQUE scope on (unit, head, period).

Suppose January has been paid. Inserting another detail row for January for the same unit and head violates the constraint.

Now the amount per period. For a per-sqft head, amt = quantity × applicable_rate.

It is calculated once at write time. The rate is resolved at transactionDateTime. It is stored immutably and never recalculated.

*[DEMO: vault/01-Domain/ERD.md → Contributions then ContributionDetails. Show FK chain: ContributionDetails.contributionId → Contributions.id and ContributionDetails.contributionPeriodId → ContributionPeriods.id. Then prisma/schema.prisma → ContributionDetail model.]*

---

## Slide B-05-3 — The Self-Validating Constraint

The amount distribution rule says: SUM(ContributionDetails.amt) WHERE contributionId = X must equal quantity × rate × periodCount.

Every time you write a contribution, you can verify it. Sum the detail amounts and compare to the formula. If they disagree, the write logic has a bug.

This is the self-validating property of the header + detail model. The rule is derived from the data, not stored separately.

You cannot pass this check by accident.

It is also the basis for the correction model. Suppose a contribution is incorrect. A compensating transaction creates a new header + detail set with negative amounts.

The sum of original plus compensating equals zero. The correction is visible and auditable.

*[DEMO: vault/01-Domain/Domain-Rules.md → Financial Integrity Rule 4 (Amount Consistency Rule). Read aloud. Then vault/V1/contribution-vision.md → Section C.2 (Compensating Transactions).]*

---

# 06 — Exercise: Design from Rules (7 min)

## Slide B-06-1 — Exercise Setup

We have a new module: Society Event Bookings. Five rules are given. Pause and design the tables.

Rule E1: no double booking. One booking per space per date.

Rule E2: booking fees may change year to year. Historical bookings must show the original fee.

Rule E3: cancellations must be retained.

Rule E4: exactly one resident per booking. The resident must be active on the booking date.

Rule E5: spaces can be added at any time. They are not hardcoded.

Before resuming, write three things. First, how many tables. Second, what rule drives each. Third, which constraints need service logic and which need a DB constraint.

Now classify first. E1 is a cardinality overlap. E2 is an append-only rate history. E3 is immutability. E4 is an FK plus eligibility. E5 is a user-managed lookup.

*[DEMO: Static. Pause for 2 minutes.]*

---

## Slide B-06-2 — Sample Answer Walkthrough

Four tables: CommonSpaces, SpaceFees, SpaceBookings. No fourth needed in V1.

CommonSpaces comes from E5. It is a standard user-managed lookup. It has no special structure.

SpaceFees comes from E2. Suppose you recognised the append-only rate history pattern from topic 4. Then you solved it in thirty seconds.

It has the same structure as ContributionRates.

SpaceBookings comes from E1, E3, and E4.

UNIQUE on (spaceId, bookingDate) WHERE status = Active handles E1. A status field plus no DELETE enforces E3. A service check against UnitResidents on bookingDate handles E4.

Notice what we did not build. We did not build a separate cancellation table. We did not build a booking period table. We did not build a booking events log.

The rules did not require those. We built exactly what the rules required.

*[DEMO: Show four-table diagram. Point to each rule as you explain its table.]*

---

## Slide B-06-3 — Module Wrap-Up

Here are five patterns. All are derived from rules. All are already in PrismApp.

Timeline gives UnitOwners. It is a temporal rule, with service and transaction enforcement.

Calendar as data gives ContributionPeriods. It is a controlled vocabulary rule, with seed and FK enforcement.

Append-only history gives ContributionRates. It is immutability plus temporal, with service enforcement.

Header + detail gives Contributions + ContributionDetails. It is a multi-period event rule, with service enforcement.

System identity gives Individuals.isSystemIdentity. It is a cardinality exclusion rule, with a service filter.

The exercise showed a sixth case. These patterns compose. SpaceFees is rate history in a new domain. No new pattern was needed.

This is the skill this module aimed to build. It is not a set of tables to memorise. It is a set of rule-type-to-pattern mappings that work across every domain you will meet.

Open any ERD and ask: what rule produced this table? If nobody can answer, the design has a gap.

*[DEMO: vault/01-Domain/ERD.md → scroll through the full model. Name each table and its rule type. End on the Mermaid diagram at the bottom of the file.]*
