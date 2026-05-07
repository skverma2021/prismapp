# ERD – MSH Society Management System

This ERD defines the complete data model for the Contributions module.

All entities, relationships, and constraints are explicitly defined to enable AI-assisted code generation.

---

## 🧱 ENTITY DEFINITIONS

### Blocks
Represents a physical building block (Nalanda, Vaishali, Rajgir)

| Field | Type | Notes |
|------|------|------|
| id | string (UUID) | Primary Key |
| description | string | Block name |

---

### Units
Represents a flat within a block

| Field | Type | Notes |
|------|------|------|
| id | string (UUID) | Primary Key |
| description | string | Flat number or label |
| blockId | string (FK → Blocks.id) | |
| sqFt | integer | Area |
| inceptionDt | datetime | Ownership continuity starts here |

---

### Individuals
Represents a person (owner, resident, or payer)

| Field | Type | Notes |
|------|------|------|
| id | string (UUID) | Primary Key |
| fName | string | First name |
| mName | string | Middle name |
| sName | string | Surname |
| eMail | string | Unique |
| mobile | string | Primary contact |
| altMobile | string | Optional |
| genderId | integer (FK → GenderTypes.id) | |
| isSystemIdentity | boolean | True for operational identities such as builder inventory |
| systemTag | string (nullable, unique) | e.g. `BUILDER_INVENTORY` |

---

### GenderTypes

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| description | string | |

---

### UnitOwners
Tracks ownership history (temporal)

| Field | Type | Notes |
|------|------|------|
| id | string (UUID) | Primary Key |
| unitId | string (FK → Units.id) | |
| indId | string (FK → Individuals.id) | |
| fromDt | datetime | Ownership start |
| toDt | datetime (nullable) | NULL = current |

---

### UnitResidents
Tracks residency history (temporal)

| Field | Type | Notes |
|------|------|------|
| id | string (UUID) | Primary Key |
| unitId | string (FK → Units.id) | |
| indId | string (FK → Individuals.id) | |
| fromDt | datetime | Residency start |
| toDt | datetime (nullable) | NULL = current |

---

## 💰 CONTRIBUTION MODEL

### ContributionHeads
Defines types of contributions

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| description | string | e.g., Maintenance, Gym |
| payUnit | integer | Defines unit of charge (1=per unit, 2=per person, etc.) |
| period | string | monthly / yearly |

---

### ContributionRates
Historical rates for contribution heads

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| contributionHeadId | integer (FK → ContributionHeads.id) | |
| reference | string | Optional note |
| fromDt | datetime | Start date |
| toDt | datetime (nullable) | NULL = active |
| amt | decimal | Rate |

---

### ContributionPeriods
Represents a billing period

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| refMonth | integer (1–12) | |
| refYear | integer | |

---

### Contributions
Represents a payment transaction

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| unitId | string (FK → Units.id) | |
| contributionHeadId | integer (FK → ContributionHeads.id) | |
| quantity | integer | Computed from payUnit rules |
| periodCount | integer | Number of periods paid |
| transactionId | string | External reference |
| transactionDateTime | datetime | |
| depositedBy | string (FK → Individuals.id) | Who paid |

---

### ContributionDetails
Maps a contribution to specific periods

| Field | Type | Notes |
|------|------|------|
| id | integer | Primary Key |
| contributionId | integer (FK → Contributions.id) | |
| contributionPeriodId | integer (FK → ContributionPeriods.id) | |
| amt | decimal | Amount allocated |

---

---

## 🛠️ COMPLAINT MANAGEMENT MODEL (CMM)

### ComplaintCategories

| Field       | Type    | Notes                       |
|-------------|---------|-----------------------------|
| id          | integer | Primary Key                 |
| description | string  | e.g., Plumbing, Electrical  |

---

### ComplaintPriorities

| Field       | Type    | Notes                           |
|-------------|---------|----------------------------------|
| id          | integer | Primary Key                      |
| label       | string  | P1, P2, P3                       |
| slaHours    | integer | Target resolution time in hours  |
| description | string  | Example scenario                 |

---

### Complaints

| Field          | Type                                   | Notes                                          |
|----------------|----------------------------------------|------------------------------------------------|
| id             | string (UUID)                          | Primary Key                                    |
| ticketId       | string                                 | Unique, system-generated                       |
| unitId         | string (FK → Units.id)                 | Complaint location                             |
| reportedById   | string (FK → Individuals.id)           | Complainant                                    |
| categoryId     | integer (FK → ComplaintCategories.id)  |                                                |
| priorityId     | integer (FK → ComplaintPriorities.id)  |                                                |
| title          | string                                 |                                                |
| description    | string                                 |                                                |
| isAnonymous    | boolean                                | If true, reportedById hidden from residents    |
| status         | enum                                   | Open, Assigned, InProgress, Resolved, Closed, Reopened |
| assignedToId   | string (FK → Individuals.id, nullable) | MC member or staff                             |
| resolvedAt     | datetime (nullable)                    | Set when status → Resolved                     |
| closedAt       | datetime (nullable)                    | Set when status → Closed                       |
| reopenDeadline | datetime (nullable)                    | resolvedAt + 48 hours; cleared on Closed       |
| createdAt      | datetime                               |                                                |
| updatedAt      | datetime                               |                                                |

---

### ComplaintNotes

| Field       | Type                            | Notes                   |
|-------------|---------------------------------|-------------------------|
| id          | string (UUID)                   | Primary Key             |
| complaintId | string (FK → Complaints.id)     |                         |
| authorId    | string (FK → Individuals.id)    | Note author             |
| content     | string                          |                         |
| visibility  | enum                            | Internal, Resident      |
| createdAt   | datetime                        |                         |

---

## 🔗 RELATIONSHIPS (SUMMARY)

- Block → Units (1:N)
- Unit → Contributions (1:N)
- Individual → Contributions (1:N)
- Contribution → ContributionDetails (1:N)
- ContributionPeriods → ContributionDetails (1:N)
- ContributionHeads → ContributionRates (1:N)
- Individuals ↔ Units via UnitOwners (temporal)
- Individuals ↔ Units via UnitResidents (temporal)
- ComplaintCategories → Complaints (1:N)
- ComplaintPriorities → Complaints (1:N)
- Unit → Complaints (1:N)
- Individual → Complaints as reporter (1:N)
- Individual → Complaints as assignee (1:N, nullable)
- Complaint → ComplaintNotes (1:N)
- Individual → ComplaintNotes as author (1:N)

---

## ⚖️ DOMAIN RULES (CRITICAL FOR AI)

1. A Unit can have multiple owners over time, but only one active owner at a time.
2. Ownership continuity starts on `Units.inceptionDt` and cannot contain gaps.
3. A Unit enters the system in builder inventory unless a historical import starts a natural owner exactly on `inceptionDt`.
4. A Unit can have multiple residents over time.
5. `toDt = NULL` indicates current ownership/residency.
6. `Units.sqFt` must not change after any per-sq-ft contribution exists for that unit.
7. Residency cannot be recorded while the active owner is `BUILDER_INVENTORY`, and system identities cannot be selected as residents.
6. Contributions are immutable once recorded.
7. Contribution rate is NOT derived dynamically — it must be captured at time of payment.
8. ContributionDetails must fully distribute total contribution amount.
9. A Contribution must map to at least one ContributionPeriod.
10. depositedBy must always be a valid Individual (no anonymous payments).
11. A Complaint must have a category and a priority.
12. Complaint `ticketId` is system-assigned and immutable after creation.
13. Complaint status lifecycle: `Open → Assigned → In Progress → Resolved → Closed`; `Reopened` returns to `Open` within 48 hours of `resolvedAt`.
14. Anonymous complaints store `reportedById` but must not expose it in resident-facing API responses.
15. `ComplaintNotes` are append-only; `Internal` visibility restricts access to Admin/Manager roles.

---

## 🧠 DERIVED LOGIC (FOR AI GENERATION)

- quantity depends on ContributionHeads.payUnit
    - payUnit=1 -> Units.sqFt
    - payUnit=2 -> operator-entered availing person count; requires at least one active resident for unit
    - payUnit=3 -> 1 (lumpsum per unit)
- per-period detail amount = quantity x applicable contributionRate
- total payable for contribution = quantity x applicable contributionRate x periodCount
- total contribution amount = SUM(ContributionDetails.amt)
- active owner = UnitOwners where toDt IS NULL
- active resident = UnitResidents where toDt IS NULL


## Constraints

- Unique Constraints
	- Units.description must be unique within a block
	- Individuals.email must be unique
	- Individuals.mobile must be unique
- Non-overlapping temporal constraint 
	- UnitOwners: No overlapping date ranges for same unit
    - UnitOwners: No gaps after Units.inceptionDt for same unit
	- UnitResidents: No overlapping date ranges for same unit
- Contribution uniqueness constraint
	- One unit cannot have multiple contributions for same head + same period
---

## 🧩 MERMAID ERD (VISUAL)

```mermaid
erDiagram

    Blocks ||--o{ Units : has
    Units ||--o{ Contributions : records
    Individuals ||--o{ Contributions : makes

    ContributionHeads ||--o{ Contributions : defines
    ContributionHeads ||--o{ ContributionRates : has

    Contributions ||--o{ ContributionDetails : maps
    ContributionPeriods ||--o{ ContributionDetails : links

    Individuals ||--o{ UnitOwners : owns
    Units ||--o{ UnitOwners : owned_by

    Individuals ||--o{ UnitResidents : resides
    Units ||--o{ UnitResidents : occupied_by