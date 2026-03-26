# Entities – MSH Society Management System

This document explains each entity in business terms with examples and rules.

It is designed to:
- complement ERD.md
- remove ambiguity for AI
- serve as the source for API + UI generation

---

# 🧱 CORE STRUCTURE

## Blocks
Represents a building block (residential tower).

### Key Points
- A Block contains multiple Units
- Block names are unique within the society

### Sample Data

| id | description |
|----|------------|
| 1  | Vaishali   |
| 2  | Nalanda    |
| 3  | Rajgir     |

---

## Units
Represents a residential flat within a Block.

### Key Points
- Each Unit belongs to exactly one Block
- Units are uniquely identified by description within a Block

### Sample Data

| id | description | blockId | sqFt |
|----|------------|--------|------|
| 1  | V-101      | 1      | 1500 |
| 2  | V-102      | 1      | 1700 |
| 3  | V-103      | 1      | 1900 |

---

## Individuals
Represents a person associated with the society.

### Key Points
- A person can be:
  - Owner
  - Resident
  - Both
  - Historical (past association)
- Same individual can own multiple Units
- Same individual can reside in only one Unit at a time

### Sample Data

| id | fName | sName | mobile | genderId |
|----|------|------|--------|----------|
| 1  | R    | Singh | 9518... | 0 |
| 2  | P    | Rai   | 7536... | 1 |

---

## GenderTypes

### Sample Data

| id | description |
|----|------------|
| 0  | Male       |
| 1  | Female     |
| 2  | Other      |

---

# 👥 TEMPORAL RELATIONSHIPS

## UnitOwners
Tracks ownership history of Units.

### Key Rules
- A Unit can have only ONE active owner at a time
- An Individual can own multiple Units
- `toDt = NULL` → current owner

### Sample Data

| id | unitId | indId | fromDt | toDt |
|----|--------|-------|--------|------|
| 1  | 1      | 1     | 01-01-2024 | NULL |

---

## UnitResidents
- A Unit can have at most one active resident at a time
- An Individual can reside in multiple Units simultaneously
- A Unit may have no resident (vacant)
- `toDt = NULL` → current resident


### Sample Data

| id | unitId | indId | fromDt | toDt |
|----|--------|-------|--------|------|
| 1  | 1      | 1     | 01-05-2025 | NULL |

---

# 💰 CONTRIBUTION SYSTEM

## ContributionHeads
Defines types of contributions.

### Key Concepts
- Defines HOW contribution is calculated
- payUnit determines calculation logic

### payUnit Meaning

| Value | Meaning |
|------|--------|
| 1 | per sqft |
| 2 | per person |
| 3 | lumpsum |

### Sample Data

| id | description | payUnit | period |
|----|------------|--------|--------|
| 1  | Maintenance | 1 | Month |
| 2  | Mandir      | 3 | Month |

---

## ContributionRates
Defines rate history for each contribution head.

### Key Rules
- Only one active rate per head at a time
- `toDt = NULL` → current rate
- Rates are NOT updated → new rows are inserted

### Sample Data

| id | headId | fromDt | toDt | amt |
|----|--------|--------|------|-----|
| 2  | 1      | 01-01-2025 | 30-06-2025 | 1.50 |
| 12 | 1      | 01-07-2025 | NULL | 2.00 |

---

## ContributionPeriods
Represents billing periods.

### Key Concepts
- Month-based periods
- Month=0 represents full year

### Sample Data

| id | refMonth | refYear |
|----|----------|--------|
| 2  | 1        | 2025 |
| 13 | 12       | 2025 |
| 14 | 0        | 2026 |

---

## Contributions
Represents a payment transaction.


### Key Concepts
- One Contribution = one payment event
- Can cover multiple periods
- Amount is NOT stored here (derived via details)
- Contributions are immutable
- quantity is server-computed from payUnit rules

### Derived Logic
- quantity depends on payUnit:
  - per sqft → unit.sqFt
  - per person → operator-entered availing person count (requires at least one active resident)
  - lumpsum → 1 (payUnit=3, rate comes from contributionRates)
- per-period detail amount = quantity x applicable rate
- total payable amount = quantity x applicable rate x periodCount

### Sample Data

| id | unitId | headId | quantity | periodCount | depositedBy |
|----|--------|--------|----------|------------|------------|
| 3  | 1      | 1      | 1500     | 2          | 1 |

---

## ContributionDetails
Breakdown of a Contribution across periods.


### Key Rules
- Each Contribution must have ≥1 detail row
- Sum(amt) = total contribution
- Each row maps to exactly one period
- Sum of all details must equal total contribution amount
- System must prevent duplicate contributions for same unit, head, and period

### Sample Data

| id | contributionId | periodId | amt |
|----|----------------|----------|-----|
| 2  | 3              | 13       | 3000 |
| 3  | 3              | 15       | 3000 |

---

# ⚖️ CROSS-ENTITY RULES (CRITICAL)

1. A Unit must always have an owner
2. A Unit can have only one active resident
3. Contributions are immutable after creation
4. Rates are captured at time of payment (no recalculation)
5. ContributionDetails must fully allocate payment amount
6. depositedBy must be a valid Individual
7. No overlapping ownership periods for same Unit
8. No overlapping residency periods for same Unit

---

# 🧠 HOW AI SHOULD INTERPRET THIS

- Use ERD.md for structure
- Use Entities.md for meaning
- Use Domain-Rules.md for enforcement

This file ensures:
→ correct API generation  
→ correct validation logic  
→ correct UI behavior  