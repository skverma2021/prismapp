# Walkthrough — Ownerships (Timeline / Temporal Data Module)

Ownerships introduces a pattern you will find in any system that tracks *who holds what, and when*: the **temporal record**. Each row has a `fromDt` and `toDt`, forming a timeline. The domain requires that this timeline is gapless and non-overlapping. Read this after the Units walkthrough — it reuses the same service/route/UI structure but adds a new class of business rules.

The Residencies module is structurally identical. Once you understand Ownerships, Residencies requires almost no new learning.

---

## The Core Problem

A unit has one owner at any moment in time. Over years, ownership may change. You need to be able to answer:

- *Who owned unit A-101 on 1 Jan 2023?*
- *When did the current owner take over?*
- *Has unit A-101 ever been vacant (no owner)?*

A simple "current owner" field on the Unit table cannot answer the first two questions. You need a timeline.

---

## The Data Model

```prisma
model UnitOwner {
  id        String    @id @default(uuid())
  unitId    String
  indId     String
  fromDt    DateTime
  toDt      DateTime?   // null = active (no end date)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  unit       Unit       @relation(...)
  individual Individual @relation(...)

  @@map("unit_owners")
}
```

`toDt` is **inclusive** — the owner held the unit up to and including that date. The day after `toDt` belongs to the next owner. A `null` `toDt` means the ownership is still active.

---

## The Three Domain Rules

Enforced in `src/modules/ownerships/ownerships.service.ts`:

### Rule 1 — No overlap

Two ownership rows for the same unit cannot cover the same day:

```ts
// ownerships.helpers.ts
export function rangesOverlap(aStart, aEnd, bStart, bEnd): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;
  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}
```

Note: adjacent rows where `A.toDt === B.fromDt` (same day) are considered overlapping. `toDt` is inclusive — the same day cannot belong to two owners. The correct gap between two owners is: `B.fromDt = A.toDt + 1 day`.

### Rule 2 — Continuity

Ownership history must be continuous — no gaps. The first row must start on the unit's `inceptionDt`. Each subsequent row must start exactly one day after the previous row ends:

```ts
async function ensureOwnershipContinuity(tx, unitId, inceptionDt, candidate) {
  const timeline = [...existing, candidate].sort((a, b) => a.fromDt - b.fromDt);

  if (timeline[0].fromDt !== inceptionDt) {
    throw new HttpError(409, "CONFLICT",
      `Ownership history must start on the unit inception date.`);
  }

  for (let i = 0; i < timeline.length - 1; i++) {
    const current = timeline[i];
    const next = timeline[i + 1];

    if (current.toDt === null) {
      throw new HttpError(409, "CONFLICT",
        "Cannot add a future row after an active owner.");
    }

    const expectedNextFrom = addDays(current.toDt, 1);
    if (next.fromDt !== expectedNextFrom) {
      throw new HttpError(409, "CONFLICT",
        "Ownership history must remain continuous with no gaps.");
    }
  }
}
```

This function is called on every create and update. The candidate row is inserted into the existing timeline, sorted, and the whole sequence is validated. This makes the check robust against edits to middle rows, not just appends.

### Rule 3 — Date not before inception

An ownership `fromDt` cannot be earlier than the unit's `inceptionDt`:

```ts
// ownerships.helpers.ts
export function ensureNotBeforeUnitInception(unitInceptionDt, fromDt, label): void {
  if (fromDt < unitInceptionDt) {
    throw new HttpError(400, "VALIDATION_ERROR",
      `${label} cannot be earlier than the unit inception date.`);
  }
}
```

---

## The Transfer Operation

Transferring ownership is not a delete + create. It is an atomic update of the outgoing owner's `toDt` followed by creation of the incoming owner's row:

```
POST /api/ownerships/transfer
{
  "unitId": "unit-uuid",
  "incomingIndId": "new-owner-uuid",
  "transferDt": "2026-06-01"
}
```

The service:
1. Finds the current active ownership row (the one with `toDt = null`)
2. Sets `toDt = transferDt - 1 day` on the outgoing row
3. Creates a new row with `fromDt = transferDt`, `toDt = null`, `indId = incomingIndId`
4. Validates continuity across both operations in a single `$transaction`

Both writes happen atomically. If the continuity check fails (e.g., the new `fromDt` is not exactly one day after the closed `toDt`), the entire transaction rolls back.

Why a dedicated transfer route rather than a `PUT` on the existing row? Because a transfer is semantically a multi-record operation — it changes two rows. A `PUT` on one record would require the caller to know about and correctly update both rows. A dedicated route enforces the invariant at the API boundary.

---

## The Helpers Module

`src/modules/ownerships/ownerships.helpers.ts`

Pure, stateless functions with no database dependency:

| Function | Purpose |
|---|---|
| `rangesOverlap(aStart, aEnd, bStart, bEnd)` | Returns true if two date ranges share any day |
| `addDays(date, n)` | Returns a new Date `n` calendar days after `date` |
| `ensureNotBeforeUnitInception(inception, from, label)` | Throws if `from` is earlier than `inception` |

These are extracted into a helpers file specifically so they can be unit-tested without a database or HTTP context. See `src/modules/ownerships/__tests__/` for the test suite.

The `addDays` implementation uses millisecond arithmetic:
```ts
return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
```

This is safe for UTC dates (which ownership dates are) but would have edge cases around daylight-saving transitions if you used local time. Store and compare all dates as UTC midnight.

---

## The Builder Inventory as Starting Owner

Every new unit starts with the Builder Inventory as its first owner (see the Units walkthrough). This means:

- The continuity check always finds an existing row starting at `inceptionDt`
- The first real transfer replaces builder inventory as the outgoing owner
- The UI allows registering a "real" first owner by transferring from builder inventory on a chosen date

The builder inventory individual has `isSystemIdentity = true`. It cannot be deleted, edited, or used as a regular payer in contributions.

---

## API Routes

```
GET    /api/ownerships              ← paginated list (filterable by unit, individual)
POST   /api/ownerships              ← create (used for back-dated entries, not for live transfers)
GET    /api/ownerships/[id]         ← single record
PUT    /api/ownerships/[id]         ← edit dates or owner on an existing row
DELETE /api/ownerships/[id]         ← guarded: only allowed if it would leave the timeline valid
POST   /api/ownerships/transfer     ← the transfer operation (preferred for live ownership changes)
```

The `DELETE` endpoint checks that removing the row does not leave gaps or an incorrect start date. In practice, deletion is rare and primarily used to fix data-entry mistakes.

---

## Residencies — The Same Pattern

`src/modules/residencies/` is structurally identical to Ownerships with two differences:

1. A unit can have **zero residents** (vacant). The continuity rule does not apply — gaps are allowed.
2. There is no transfer operation — you close one residency and create the next independently.

Reading the Ownerships service makes the Residencies service immediately understandable.

---

## Things Worth Noticing

**Why `null` for active (not a far-future date).** Using `null` for an open-ended range avoids the "year 9999" pattern, which is a workaround, not a model. A query for "current owner" is: `WHERE toDt IS NULL`. This is unambiguous and index-friendly.

**The overlap check fetches all rows, not just adjacent ones.** The service loads every existing ownership row for the unit before checking. This is correct — a new row in the middle of a timeline could overlap with any existing row, not just its immediate neighbours.

**Continuity is checked on every write, not just on create.** Editing the middle of a timeline is rare but possible. The continuity validator re-sorts the full timeline including the candidate row before validating, so mid-timeline edits are covered.

**The `$transaction` wraps both the validation checks and the write.** If you validated outside the transaction, another concurrent request could modify the timeline between your check and your write — a classic TOCTOU race. The check and write must be atomic.

---

## What to Read Next

- **`src/modules/ownerships/__tests__/`** — unit tests for `rangesOverlap` and `ensureOwnershipContinuity`. Good examples of testing domain logic without a database.
- **`src/modules/residencies/`** — apply what you learned here. Identify the two differences and nothing else will surprise you.
- **`course/walkthrough/individuals.md`** — Ownerships references individuals heavily. Understanding system identities helps explain the builder inventory role.
