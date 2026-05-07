# Complaint Management Module (CMM) — Vision

Status: Planned (V2)
Owner: Product + Engineering
Date: 2026-05-07

## Purpose

Define the vision, scope, and feature priorities for the Complaint Management Module (CMM). CMM is the highest-priority backlog module, planned for development after the Contribution Module achieves production-grade status.

CMM enables residents to log complaints, track resolution status, and hold the Managing Committee (MC) accountable to defined SLAs.

## Revised Backlog Sequence

CMM moves to position 1 in the post-V1 backlog. The updated order is:

1. **CMM** — Complaint lifecycle management, ticketing, routing, and SLA tracking.
2. **Safety** — Checklists, incident reporting, and compliance tracking for common areas and building systems.
3. **Security** — Visitor management, security incident logging, and access control workflows.
4. **Events and Common-Space Bookings** — Event scheduling, common hall and amenity reservations, and calendar management.

## A. Complaint Lifecycle — Core Flow

### 1. Complaint Categories

Predefined types to reduce free-text entry and enable automatic routing:

`Plumbing` · `Electrical` · `Civil` · `Lift` · `Security` · `Housekeeping` · `Parking` · `Noise` · `Common Area Misuse` · `Billing Dispute`

### 2. Photo Attachment

Residents can attach photo evidence at complaint creation (e.g., seepage, structural damage). Required for verifiable escalation and audit.

### 3. Auto Ticket ID and Timestamp

System-assigned ticket reference (e.g., `HSR-2026-00127`). Eliminates verbal disputes about whether a complaint was ever logged.

### 4. Priority and SLA Tags

| Priority | Example Issue | Target Resolution |
|----------|---------------|-------------------|
| P1 | No water / power outage | 4 hours |
| P2 | Lift breakdown | 24 hours |
| P3 | Gardening, cosmetic | 72 hours |

SLA breach triggers automatic escalation (see Section B).

### 5. Status Lifecycle

`Open → Assigned → In Progress → Resolved → Closed → Reopened`

Residents receive push or SMS notification on each status transition.

## B. Routing and Assignment

### 1. Auto-Assignment by Category

Route complaint to the relevant vendor or MC member based on category (e.g., `Plumbing` → plumber contact + MC Infrastructure Secretary).

### 2. Escalation Matrix

| Condition | Action |
|-----------|--------|
| P1 not `Assigned` within 2 hours | Notify Secretary |
| P1 not `Resolved` within SLA | Notify President and all MC members |
| Any priority exceeds SLA | Log SLA breach event on ticket |

### 3. Internal vs Resident-Visible Notes

- **MC notes (internal):** Vendor coordination, cost estimates, private investigation details.
- **Resident notes (visible):** High-level status updates only (e.g., "Work scheduled for May 6").

## C. Resident Experience

### 1. Anonymous Complaints

For sensitive issues (e.g., nuisance caused by a specific flat). Reporter identity is visible only to MC, not on the public ticket view.

### 2. Vote / Upvote Similar Complaints

Multiple residents facing the same issue (e.g., low water pressure) can upvote a single existing ticket rather than creating duplicates. Reduces noise, improves prioritisation signal.

### 3. Reopen Window

Resident can reopen a `Resolved` ticket within 48 hours if the issue persists. Prevents premature MC closure.

### 4. Offline Logging via WhatsApp / SMS Bot

For residents who will not use a web or mobile app. Example flow: `HI → 3 → [Photo]` creates a ticket via WhatsApp Business API. **Deferred to V3+.**

## D. MC / Admin Features

### 1. Complaint Dashboard

- Filter by status, priority, category, block, and date range.
- Heatmap by tower / floor to identify recurring structural issues and support structural audit decisions.

### 2. Bulk Close with Templated Replies

Close multiple tickets triggered by the same root event (e.g., BESCOM outage) with a single canned response.

### 3. Vendor Rating and Feedback

Post-closure: resident rates resolution (1–5 stars). MC uses ratings to review vendor contracts. Vendors below threshold trigger a contract review flag.

### 4. Immutable Audit Trail

Every action (assignment, note, status change, closure) is logged with actor identity and timestamp. Required for disputes before the Registrar or consumer court.

### 5. GBM Export

One-click summary report: ticket count, SLA compliance rate, top issues by category. Output format: PDF or CSV.

## E. Compliance and India-Specific Nuance

### 1. OTP-Based Closure for Physical Work

Resident receives a one-time password in the app. Vendor must enter the OTP on-site to mark a ticket `Resolved`. Prevents false closure without resident confirmation. **Deferred to V3+.**

### 2. Festival / Event Mode

Suppress non-emergency complaint notifications during MC-approved hours (e.g., Diwali 7pm–10pm). Auto-reply with applicable bye-law reference.

### 3. Authority Escalation

One-tap generate a formal letter to the relevant local authority (municipality, police) with an attached ticket log.

### 4. Data Retention

Resolved tickets retained for a minimum of 3 years per society bye-law requirements.

## Implementation Notes

### Infrastructure Reuse from V1

CMM can leverage the following V1 building blocks without modification:

| V1 Asset | CMM Usage |
|----------|-----------|
| `Individual` entity | Complainant identity (resident or owner) |
| `Unit` and `Block` entities | Complaint location reference |
| `AuditLog` model | Extend for ticket state transitions |
| Role model (Admin, Manager, Read-Only) | Maps directly to MC and resident roles |
| Shared error envelope | Unchanged |
| Zod validation utilities | Reuse for ticket input validation |

### New Infrastructure Required

- **Ticket ID sequence** — Deterministic, conflict-safe sequential ID generator.
- **File / image storage** — Photo upload requires Vercel Blob or an S3-compatible provider.
- **Notification service** — Push, SMS, or WhatsApp integration for status change alerts.
- **SLA timer and escalation** — Cron-based or event-driven scheduler for SLA breach detection.

### Deferred to Later Phases

- WhatsApp / SMS bot intake (V3+)
- OTP-based physical closure (V3+)
- Maker-checker for MC closure approvals
- Festival / event suppression mode
- Authority letter generation

## Open Questions

1. Which notification channel is primary for V2: push only, or push + SMS?
2. Should vendors be modelled as `Individuals` with a vendor role, or managed as a separate entity?
3. Should anonymous complaints be visible to all MC members, or only to Secretary and President?
4. Photo storage provider decision: Vercel Blob vs external S3-compatible bucket?
5. Is upvoting in scope for V2 or deferred (requires deduplication logic)?