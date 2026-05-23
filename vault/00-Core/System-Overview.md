# MSH Society Management System

A comprehensive management system for **Magadh Signature Homes (MSH)** residential society which has three blocks - Nalanda, Vaishali, Rajgir each having a number of units (flats). This application manages society's activities such as maintenance, services (Gym, Swimming Pool, Yoga Classes), Renting Common Hall, organizing yearly events. 

To start with, the module for managing contributions by residents/owners has been taken up. The following modules are planned as backlog items after V1:

## V1 Delivered Modules

The following modules have been delivered and are production-ready:

1. **Master Data** — Blocks, Units, Individuals, Ownership timelines, Residency timelines. See [`vault/V1/master-data-vision.md`](../V1/master-data-vision.md).
2. **Contributions** — Contribution heads, rates, periods, payment capture, financial immutability, compensating corrections, and reports. See [`vault/V1/contribution-vision.md`](../V1/contribution-vision.md).

## Backlog Modules (Post V1)

The following modules are planned in priority order. CMM is the next module to be developed after the Contribution Module achieves production-grade status.

1. **CMM (Complaint Management Module)** — Complaint lifecycle management, ticketing with auto ID, priority and SLA tracking, routing and escalation, and resident-facing status updates. See [`vault/CMM/cmm-vision.md`](../CMM/cmm-vision.md).
2. **Safety** — Checklists, incident reporting, and compliance tracking for common areas and building systems.
3. **Security** — Visitor management, security incident logging, and access control workflows.
4. **Events and Common-Space Bookings** — Event scheduling, common hall and amenity reservations, and calendar management.

These modules will reuse the shared policy, audit, and role infrastructure established during V1 hardening. Domain rules and API contracts should be added to `vault/01-Domain/` and `vault/03-API/` when implementation begins.

## Features

-  [[Dashboard.excalidraw]]: Overview of Issues, Events, Contribution Status and References 

- [[Managing Units]]: Track all units  with area and assignments

- [[Individuals-List.excalidraw]] Browse all Individuals - Owners, Residents, and Others

- [[Individuals-Form.excalidraw]]: Manage owners and residents information
-
- [[Contributions.excalidraw]]: Manage contributions from units

- [[crossTab.excalidraw]]: Track paid/unpaid status for each month