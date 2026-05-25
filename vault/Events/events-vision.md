# Events and Common-Space Bookings — Vision Document

## 1. Purpose

Residents and the management committee need to reserve shared resources — the Common Hall, Gym, Swimming Pool, and Yoga Room — for private use. The Events module provides a simple request-and-approval booking system that prevents double-booking, keeps a full audit trail, and gives all roles visibility into the resource calendar.

This module is designated as the **Module I student exercise**. It reinforces the interval-overlap pattern introduced in Section D (ownerships and residencies) and applies it to a resource-scheduling domain.

---

## 2. Entities

### Resource
A bookable physical space or amenity owned by the society.

| Field | Type | Notes |
|---|---|---|
| `id` | Int (auto-increment) | Primary key |
| `name` | String (unique) | e.g. "Common Hall", "Gym" |
| `description` | String? | Optional description |
| `capacity` | Int? | Max guests; null = no limit enforced |
| `isActive` | Boolean | Inactive resources reject new bookings |

Seed data: Common Hall (150), Gym (20), Swimming Pool (40), Yoga Room (15).

### Booking
A request to exclusively use a `Resource` for a time slot.

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `resourceId` | Int | FK → Resource |
| `requestedById` | UUID | FK → Individual |
| `title` | String | Purpose label, e.g. "Sharma birthday party" |
| `purpose` | String? | Additional detail |
| `startDt` | DateTime | Slot start (inclusive) |
| `endDt` | DateTime | Slot end (exclusive) |
| `guestCount` | Int | Expected number of guests |
| `status` | String | Pending \| Approved \| Rejected \| Cancelled |
| `approvedById` | String? | AppUser.id of approver |
| `approvedAt` | DateTime? | — |
| `rejectedById` | String? | AppUser.id of rejector |
| `rejectedAt` | DateTime? | — |
| `rejectionReason` | String? | Required when status = Rejected |
| `cancelledById` | String? | AppUser.id of canceller |
| `cancelledAt` | DateTime? | — |
| `cancellationReason` | String? | Optional |
| `actorUserId` | String? | AppUser.id who created the record |
| `actorRole` | String? | Role of operator at create time |

---

## 3. Status Lifecycle

```
Pending ──► Approved ──► Cancelled (before startDt only)
        │
        ├──► Rejected   (terminal)
        │
        └──► Cancelled  (before startDt only)
```

| From | To | Who | Conditions |
|---|---|---|---|
| Pending | Approved | MANAGER / SOCIETY_ADMIN | No overlapping Approved booking for same resource (BK2) |
| Pending | Rejected | MANAGER / SOCIETY_ADMIN | `rejectionReason` required |
| Pending | Cancelled | MANAGER / SOCIETY_ADMIN | Before `startDt` |
| Approved | Cancelled | MANAGER / SOCIETY_ADMIN | Before `startDt` |
| Rejected | — | — | Terminal |
| Cancelled | — | — | Terminal |

---

## 4. Domain Rules

| # | Rule |
|---|---|
| BK1 | Each booking targets exactly one resource for a contiguous time slot `[startDt, endDt)`. |
| BK2 | No two Approved bookings for the same resource may have overlapping time slots. Enforced on Approve with a serialized overlap check. |
| BK3 | `startDt` must be strictly before `endDt`. Minimum duration is 30 minutes. |
| BK4 | `startDt` must be in the future at the time of booking creation. |
| BK5 | Only MANAGER or SOCIETY_ADMIN may approve or reject a booking. |
| BK6 | Only MANAGER or SOCIETY_ADMIN may cancel a booking. Cancellation is only permitted before `startDt`. |
| BK7 | Once Approved, `resourceId`, `startDt`, and `endDt` are immutable (BK7). |
| BK8 | Rejected and Cancelled bookings are terminal — no further transitions. |
| BK9 | Every status transition must be recorded in the audit log with actor identity and timestamp (CM5 pattern). |
| BK10 | A Resource with `isActive = false` cannot accept new bookings. |

---

## 5. API Direction

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/resources` | Read | List all active resources |
| GET | `/api/bookings` | Read | Paginated list with filters |
| POST | `/api/bookings` | MANAGER / ADMIN | Create new booking request |
| GET | `/api/bookings/:id` | Read | Full booking detail with resource and requestor |
| PATCH | `/api/bookings/:id` | MANAGER / ADMIN | Approve / reject / cancel |

### Query parameters for `GET /api/bookings`

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status |
| `resourceId` | number | Filter by resource |
| `from` | ISO date | Bookings starting on or after this date |
| `to` | ISO date | Bookings starting on or before this date |
| `sortBy` | `startDt` \| `createdAt` \| `status` | Default: `startDt` |
| `sortDir` | `asc` \| `desc` | Default: `asc` |
| `page` / `pageSize` | number | Pagination |

---

## 6. Implementation Phases

### Sprint 0 — Foundation (companion implementation)
- Schema: `Resource`, `Booking` models
- Migration and seed (4 resources)
- Service: `listBookings`, `getBookingById`, `createBooking`, `updateBookingStatus`
- APIs: `GET /api/resources`, `GET/POST /api/bookings`, `GET/PATCH /api/bookings/:id`
- List + create page at `app/(dashboard)/bookings/`
- Navigation wiring

### Sprint 1 — Student Exercise
Students implement the booking detail page (`app/(dashboard)/bookings/[id]/page.tsx`) including:
- Full detail card (resource, requestor, dates, guest count)
- Status transition buttons (approve / reject / cancel) — role-gated
- Rejection reason input (shown only when rejecting)
- Notes or comment thread (optional extension)

---

## 7. Relationship to Other Modules

- **Individuals** — `requestedById` links to an existing Individual. No new individual entity.
- **Audit Log** — all status transitions write to `AuditLog` via `writeAuditLog()`.
- **Roles** — reuses `requireReadRole` / `requireMutationRole` from `src/lib/authz.ts`.
- **Shared UI** — reuses `useBrowseState`, `DataTable`, `BrowseFilterBar`, `MasterDataNav`, `PaginationControls`.
