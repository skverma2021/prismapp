# Domain Glossary

**Purpose:** Define every domain term used in PrismApp code, API responses, and vault documents.  
**Use:** Keep this open while reading `Domain-Rules.md` and while working on any module. If a term in the code seems odd, look it up here first.

---

## A

**AppUser**  
A person who can log in to PrismApp. Stored in the `AppUser` table with a hashed password and a role. An AppUser is _not_ an Individual — they are the operator of the system, not a resident or owner. An Individual and an AppUser can represent the same real human but are separate records.

---

## B

**Block**  
A residential tower or building within the society. Every Unit belongs to exactly one Block. Block descriptions are unique. Example: `Vaishali`, `Nalanda`, `Rajgir`.

**BUILDER_INVENTORY**  
A system identity (a special Individual record) that holds ownership of a Unit from its inception until the first real owner takes possession. It is not a resident, not selectable by operators, and cannot be removed. Its purpose is to satisfy rule O4 — every Unit must have exactly one active owner at all times, including before any sale occurs.

---

## C

**Contribution**  
A single payment transaction. Records who paid (`depositedBy`), for which Unit, for which Contribution Head, and which periods are covered. Immutable once posted — corrections use a compensating transaction, not an in-place edit.

**ContributionDetail**  
One row per period within a payment. If a contribution covers three months, three ContributionDetail rows are created. Each row stores the per-period amount (`quantity × applicable rate`). The grain of reporting.

**ContributionHead**  
A named category of payment: Maintenance, Water, Parking, etc. Defines the payment unit (`payUnit`) and whether the head is billed monthly or yearly.

**ContributionPeriod**  
A calendar period row: a year (`refMonth = 0`) or a month within a year (`refMonth = 1–12`). Rows are seeded for each calendar year — 13 rows per year. Payments reference these rows, not free-form dates.

**ContributionRate**  
The per-unit amount for a ContributionHead over a date range. Has a `fromDt` and an optional `toDt` (`null` means currently active). The applicable rate is resolved at `transactionDateTime` — the rate effective on the payment date, not the period start.

---

## I

**inceptionDt**  
The date a Unit enters builder inventory. Ownership continuity starts on this date (rule U1). The Unit's first UnitOwner row covers `BUILDER_INVENTORY` starting from `inceptionDt`.

**Individual**  
A person in the system who may be an owner, a resident, or both, or neither. Stores name, email, mobile, gender. An Individual who also operates the system is separately represented as an AppUser.

---

## O

**Owner / Ownership**  
An Individual holding the title to a Unit for a date range. Stored in the `UnitOwner` table (`fromDt`, `toDt`, `individualId`, `unitId`). A Unit can have at most one active owner at any time (rule O3). The ownership chain must be continuous and gap-free (rule O7).

**Ownership Timeline**  
The ordered sequence of UnitOwner records for a given Unit, covering every date from `inceptionDt` to today without gaps or overlaps. The first row is always BUILDER_INVENTORY.

---

## P

**payUnit**  
An integer on ContributionHead that controls how the payable quantity is derived:  
- `1` → quantity = Unit's `sqFt` (auto-filled from the Unit record)  
- `2` → quantity = number of active residents on the transaction date (requires at least one active resident)  
- `3` → quantity = `1` (flat charge per unit)

**periodCount**  
The number of ContributionPeriod rows selected for a payment. For `period = MONTH` heads, the user explicitly picks months. For `period = YEAR` heads, exactly one yearly period is selected.

---

## R

**Resident / Residency**  
An Individual currently living in a Unit. Stored in the `UnitResident` table with `fromDt` / `toDt`. A Unit can have zero or one active resident (rule R3, R4). The residency chain may have gaps (a unit can be vacant). BUILDER_INVENTORY units cannot have residents (rule R5).

**Residency Timeline**  
The ordered sequence of UnitResident records for a given Unit. Unlike the Ownership Timeline, gaps are allowed (vacancy periods are normal).

---

## S

**sqFt**  
The area of a Unit in square feet. Used to calculate the payable amount for ContributionHeads with `payUnit = 1`. Locked (immutable) once any per-sqFt contribution has been recorded for the Unit (rule U4).

---

## T

**Temporal Overlap**  
A situation where two ownership or residency records for the same Unit have overlapping date ranges. This is a domain violation — both are enforced in service layer logic using serializable transactions.

**transactionDate / transactionDateTime**  
The date (and time) the payment was made. Used to resolve the applicable ContributionRate. Not the period start date.

---

## U

**Unit**  
An apartment, flat, or space within a Block. Has a description (unit number/name unique within the Block), a `sqFt`, and an `inceptionDt`. The core entity that everything — ownership, residency, contributions — hangs off.

---

## Quick reference table

| Term | Table / field | Key rule |
|------|--------------|----------|
| Block | `Block.description` | Unique within society |
| Unit | `Unit.description` | Unique within Block |
| inceptionDt | `Unit.inceptionDt` | Ownership starts here |
| Individual | `Individual` | Owner, resident, payer, or none |
| AppUser | `AppUser` | Operator; separate from Individual |
| BUILDER_INVENTORY | Special `Individual` | Holds ownership before first sale |
| UnitOwner | `UnitOwner` | fromDt–toDt, no gaps/overlaps |
| UnitResident | `UnitResident` | fromDt–toDt, gaps allowed |
| ContributionHead | `ContributionHead.payUnit` | What the head measures |
| ContributionRate | `ContributionRate.toDt` | null = currently active |
| ContributionPeriod | `ContributionPeriod.refMonth` | 0=year, 1–12=month |
| Contribution | `Contribution` | Immutable payment record |
| ContributionDetail | `ContributionDetail.amt` | Per-period amount |
