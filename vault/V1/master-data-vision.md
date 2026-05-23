# Master Data Module — Vision

Status: Delivered (V1)
Owner: Product + Engineering
Date: 2026-01-01 (retrospective — documented after delivery)

> **Note on timing:** This vision document was written retrospectively after the master data module was delivered. The CMM vision (`vault/CMM/cmm-vision.md`) was written *before* implementation began. Both approaches are valid. A retrospective vision document captures the reasoning behind delivered decisions before institutional memory fades and gives future maintainers a map of what was intended.

---

## Purpose

Establish the physical and people foundation of MSH Society Management. Every subsequent module — contributions, complaints, safety, events — depends on knowing *where* a unit is, *who* owns it, and *who* lives in it.

The master data module answers three questions:

1. **Where?** — Blocks and Units define the physical address structure of the society.
2. **Who?** — Individuals are the people layer: owners, residents, and payers.
3. **When?** — Ownership and Residency timelines track how those "who" relationships change over time.

Without this foundation, no financial record can be attributed to a unit, no complaint can be assigned a location, and no report can show who is responsible for what.

---

## A. Physical Structure — Blocks and Units

### 1. Blocks

The society is physically divided into named residential towers. Each tower is a Block.

MSH has three blocks: **Nalanda**, **Vaishali**, and **Rajgir**.

Blocks are reference data — they are seeded once and change only if the society builds a new tower. A block name must be unique across the society.

### 2. Units

A Unit is a residential flat within a Block. Units are identified by a description (flat number) that is unique within their block — e.g. V-101 in Vaishali.

Every unit has an `inceptionDt` — the date it enters builder inventory and from which ownership continuity is tracked. This date is set once and is effectively immutable: changing it would rewrite ownership history.

Every unit has an `sqFt` (area in square feet) used to calculate per-sq-ft maintenance contributions. Once any per-sq-ft contribution has been recorded for a unit, `sqFt` is locked.

### 3. Builder Inventory

When a unit is first created, it does not belong to a resident owner. It belongs to the builder. The system represents this with a special `BUILDER_INVENTORY` system identity — an Individual record that is not a real person and must never appear in payer or resident selection dropdowns.

Every unit creation immediately creates its first ownership row assigning the unit to `BUILDER_INVENTORY` starting on `inceptionDt`. Ownership is continuous from that point forward — there are no gaps allowed.

---

## B. People Layer — Individuals

### 1. What an Individual Is

An Individual is any person associated with the society — owner, resident, payer, or a person who is none of those at a given moment but has been in the past or may be in the future.

The Individual entity is intentionally broad. It does not encode role — role is determined by the presence of an active ownership or residency row, not by a field on the Individual record itself.

### 2. Contact Uniqueness

Email and mobile must be unique across all individuals. This prevents duplicate person records and ensures that notifications and correspondence reach the right person.

### 3. System Identities

Some Individual rows represent operational invariants, not real people. `BUILDER_INVENTORY` is the only current system identity. These are excluded from all user-facing selection dropdowns via the `isSystemIdentity` flag.

---

## C. Temporal Relationships — Ownership and Residency

### 1. Ownership Timeline

Ownership is tracked as a time-bounded relationship between a Unit and an Individual. A unit can have one and only one active owner at any moment — but over its lifetime it will have many ownership rows as it is transferred between individuals.

Ownership rules enforce **continuity**: once a unit enters inventory on `inceptionDt`, its ownership chain must be gapless. The outgoing owner ends on the day before the incoming owner starts. There are no ownership vacuums.

Ownership transfer creates two rows atomically: the previous owner's row gets a `toDt`, and the new owner's row starts the next day.

### 2. Residency Timeline

Residency tracks who physically occupies a unit. It is looser than ownership:

- A unit may have zero residents (it can be vacant).
- A unit can have at most one active resident.
- Residency cannot start while the active owner is `BUILDER_INVENTORY` — the unit must be transferred to a real owner first.
- An individual can be a resident in multiple units simultaneously (though unusual).

### 3. Why Timelines, Not Just Foreign Keys

A simple `ownerIndId` column on Units would answer "who owns this unit now." But it could not answer "who owned unit V-101 in March 2024?" or "how many times has this flat changed hands?" The timeline model answers all of these — and is required for accurate historical reporting and contribution attribution.

---

## D. What Was Delivered

| Feature | Status |
|---|---|
| Block CRUD (create, list, update, delete) | ✅ Delivered |
| Unit CRUD with inception date and sqFt | ✅ Delivered |
| Builder Inventory auto-creation on unit creation | ✅ Delivered |
| Individual CRUD with email/mobile uniqueness | ✅ Delivered |
| Ownership timeline management with overlap prevention | ✅ Delivered |
| Ownership transfer (contiguous, gapless) | ✅ Delivered |
| Residency timeline management with overlap prevention | ✅ Delivered |
| Residency creation blocked for BUILDER_INVENTORY units | ✅ Delivered |
| Role-based access (SOCIETY_ADMIN, MANAGER, READ_ONLY) | ✅ Delivered |
| Lookup endpoints for dependent modules | ✅ Delivered |

---

## E. What Was Deferred

| Deferred feature | Reason |
|---|---|
| Bulk unit import from CSV or spreadsheet | Infrastructure: file parsing pipeline not yet available |
| Floor plan or layout visualisation | Infrastructure: needs image storage and rendering |
| Unit merge / split workflows | Complexity: requires rebuilding ownership/residency chains |
| WhatsApp / SMS notification on ownership transfer | Infrastructure: notification service not yet built |
| External property registry sync | Infrastructure: no API contract with a registry exists |
| Guest unit / short-term rental tracking | Scope: deferred to post-V1 backlog |

---

## F. Infrastructure Established for Dependent Modules

Every subsequent module reuses the following without modification:

| Asset | Consumers |
|---|---|
| `Individual` entity | Contributions (depositedBy), CMM (reporter, assignee) |
| `Unit` and `Block` entities | Contributions (unit attribution), CMM (complaint location) |
| `UnitOwners` timeline | Contribution reports (active owner display) |
| `UnitResidents` timeline | Contributions (per-person eligibility), CMM (reporter eligibility) |
| Lookup endpoints (`/api/units/lookups`, `/api/individuals/lookups`) | All modules with dropdowns |
| Role model (Admin, Manager, Read-Only) | All modules |

---

## Open Questions (Post-V1)

1. Should individual records be soft-deleted when they no longer have any active ownership or residency? Or should all historical individuals be retained indefinitely?
2. Should `sqFt` have a formal change history (e.g. after a renovation officially changes the registered area)?
3. Should the builder identity be configurable per-society, or remain a fixed system constant?
