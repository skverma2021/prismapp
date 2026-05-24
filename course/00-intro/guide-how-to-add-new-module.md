# How to Add a New Module to PrismApp

**Audience:** Developers who have studied the codebase and want to add a new domain entity end-to-end.
**Purpose:** Walk through every layer — schema → service → route handlers → UI — using two contrasting examples: Blocks (simple) and Contributions (complex, with domain rules and immutability).
**Placement:** After the App Tour and before Section C (Technology Choices).

---

## What a "module" means in this codebase

A module is one domain entity and all the code that serves it. For every entity, the same six artefacts exist:

```
prisma/schema.prisma               ← model definition
src/modules/<name>/
    <name>.schemas.ts              ← input types + parse/validate functions
    <name>.service.ts              ← business logic + all Prisma calls
    <name>.helpers.ts              ← (optional) pure functions, unit-testable without DB
app/api/<name>/
    route.ts                       ← GET + POST on the collection
    [id]/route.ts                  ← GET + PATCH + DELETE on one record
app/(dashboard)/<name>/
    page.tsx                       ← the browse/manage UI
```

Nothing in this list is optional. Skipping one layer just means some other layer does too much.

---

## Example 1 — Blocks: The Minimal Module

Blocks is the simplest entity. One table, one unique constraint, no domain rules beyond "description must be unique." It is the cleanest template to read first.

### Step 1 — Schema

```prisma
// prisma/schema.prisma
model Block {
  id          String   @id @default(uuid())
  description String   @unique
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  units       Unit[]

  @@map("blocks")
}
```

**What to notice:**
- `@id @default(uuid())` — the PK is a UUID string, not an auto-increment integer. This matters for distributed inserts and URL safety.
- `@unique` — the database enforces uniqueness, not the application. When it fires, Prisma throws `P2002`, which `fromUnknownError` maps to `409 CONFLICT`.
- `@@map("blocks")` — the table name is lowercase plural. The Prisma model name stays PascalCase.
- `units Unit[]` — a back-relation. Prisma uses this to enforce `onDelete: Restrict` on the Unit side.

### Step 2 — Schemas (input types + parsing)

File: `src/modules/blocks/blocks.schemas.ts`

```typescript
export type CreateBlockInput = { description: string };
export type UpdateBlockInput = { description?: string };

export function parseCreateBlockInput(payload: unknown): CreateBlockInput {
  if (typeof payload !== "object" || payload === null)
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  const record = payload as Record<string, unknown>;
  return { description: requireString(record.description, "description") };
}
```

**What to notice:**
- The parameter type is `unknown`, not `any`. This forces explicit validation before the data enters the system. This is the trust boundary between the internet and your code.
- `requireString` is a helper in `api-response.ts` — it throws `HttpError(400)` if the value is missing or not a string. You never throw raw `Error` in validation code.
- `UpdateBlockInput` has all fields optional — PATCH is partial by design. The service adds a guard: if no fields are provided, throw 400 rather than run a no-op update.

### Step 3 — Service (business logic + DB)

File: `src/modules/blocks/blocks.service.ts`

**List with pagination:**
```typescript
// Lines 11–58
export async function listBlocks(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = Math.min(parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
  const q = searchParams.get("q")?.trim();

  const where = q
    ? { description: { contains: q, mode: "insensitive" as const } }
    : {};

  const [items, totalItems] = await db.$transaction([
    db.block.findMany({ where, skip: (page - 1) * pageSize, take: pageSize }),
    db.block.count({ where }),
  ]);
  // ... return paginated shape
}
```

**What to notice:**
- `db.$transaction([findMany, count])` — runs both queries in one round-trip and guarantees the count matches the items. Do not do `findMany` then `count` separately.
- `mode: "insensitive"` — Prisma's cross-database way to write `ILIKE`. It works on PostgreSQL without a custom collation.
- `MAX_PAGE_SIZE = 100` — cap at the service layer, not the route handler. Services own business constraints; route handlers only do auth + parse + call.

**Create with audit log:**
```typescript
// Lines 60–85
export async function createBlock(input: CreateBlockInput, actor: AuthContext) {
  const block = await db.block.create({ data: { description: input.description } });

  await writeAuditLog(db, {
    actorUserId: actor.actorUserId,
    actorRole: actor.actorRole,
    action: "BLOCK_CREATED",
    entityType: "Block",
    entityId: block.id,
    payload: { description: input.description },
  });

  return block;
}
```

**What to notice:**
- `writeAuditLog` is called **after** `db.block.create` using `db` (not inside a `$transaction`). This is deliberate — an audit failure must not roll back the business write. See Section E for the full explanation.
- The `actor` comes from the route handler, which gets it from `requireMutationRole`. The service never calls auth functions directly.

### Step 4 — Route Handler

File: `app/api/blocks/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listBlocks(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateBlockInput(payload);
    const data = await createBlock(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

**The pattern, memorised once:**
`auth guard → parse → service call → ok(data)` or `catch → fail(fromUnknownError(error))`

Every one of the 33+ route handlers in the codebase follows this exact structure. The only things that change are the auth level (`requireReadRole` vs `requireMutationRole`), the parse function, and the service function.

**What to notice:**
- `requireMutationRole` returns the `actor` object. This is passed to the service. The route handler never constructs the actor manually.
- `fromUnknownError(error, getRequestId(request))` — the second argument is the request ID injected by `proxy.ts`. It appears in structured logs when the error is a 500, enabling you to correlate the log entry to the specific request.
- The route handler has no business logic. Zero. It is pure glue.

---

## Example 2 — Contributions: The Complex Module

Contributions demonstrates everything that blocks does not: domain rules, multi-table transactions, quantity derivation, duplicate prevention, financial immutability, and the maker-checker correction flow.

### What makes it complex

| Concern | Blocks | Contributions |
|---|---|---|
| Tables written per operation | 1 | 2 (`contribution` + `contribution_details`) |
| Domain rule validation | None | 5 pre-write checks |
| Amount derivation | None | `rate × quantity` computed at write time |
| Immutability | No | Posted records cannot be edited or deleted |
| Corrections | No | Compensating transaction with reversal rows |
| Maker-checker | No | Flag-gated approval workflow |
| Helper file | Not needed | `contributions.helpers.ts` — pure, unit-testable |

### Step 1 — Schema (two related models)

```prisma
// prisma/schema.prisma
model Contribution {
  id                        Int      @id @default(autoincrement())
  unitId                    String
  contributionHeadId        Int
  quantity                  Decimal
  periodCount               Int
  transactionId             String
  transactionDateTime       DateTime
  depositedBy               String
  actorUserId               String
  actorRole                 String
  inputComment              String?
  correctionOfContributionId Int?
  correctionReasonCode      String?
  correctionReasonText      String?
  correctionStatus          String?
  // ... relations and indexes
  details                   ContributionDetail[]

  @@index([unitId, contributionHeadId])
  @@index([transactionDateTime])
  @@index([correctionOfContributionId])
  @@map("contributions")
}

model ContributionDetail {
  id                    Int     @id @default(autoincrement())
  contributionId        Int
  contributionPeriodId  Int
  contributionRateId    Int?
  amt                   Decimal
  appliedRate           Decimal?
  appliedRateReference  String?
  // ...
  @@map("contribution_details")
}
```

**What to notice:**
- The PK is an `Int @id @default(autoincrement())`, not a UUID. Integer IDs are used for financial records where sequential ordering matters for audit.
- `actorUserId` and `actorRole` are stored directly on the row — not just in the audit log. This is the primary record of who posted what.
- `correctionOfContributionId` is a self-referential FK. A correction row points back to the original via this field. It is null for regular contributions.
- Three `@@index` declarations — each one corresponds to a specific query: the month ledger, the transactions report, and the "has this been corrected?" lookup.

### Step 2 — Schemas (richer parsing)

File: `src/modules/contributions/contributions.schemas.ts`

```typescript
export type CreateContributionInput = {
  unitId: string;
  contributionHeadId: number;
  contributionPeriodIds: number[];   // array — one payment can cover multiple periods
  transactionId: string;
  transactionDateTime: Date;
  depositedBy: string;               // must be a valid individual.id
  availingPersonCount?: number;      // required only for per-person heads
  comment?: string;
  reference?: string;
};
```

**What to notice:**
- `contributionPeriodIds` is an array. A single payment can cover multiple months. The parse function checks: non-empty, all positive integers, no duplicates.
- `transactionDateTime` is parsed from a raw string — `parseRequiredDate` converts ISO string → `Date` and throws 400 if the format is invalid. Never pass raw strings to Prisma DateTime fields.
- `depositedBy` is a string ID, not a name. It references `individual.id`. The service validates the individual exists and is not a system identity.
- `availingPersonCount` is conditionally required — only needed for per-person contribution heads. This condition is checked in the service, not here. Schemas validate shape; services validate business rules.

### Step 3 — Helpers file (pure logic, testable without DB)

File: `src/modules/contributions/contributions.helpers.ts`

This file exists because some functions have no database dependency and can be fully unit-tested:

| Function | What it does |
|---|---|
| `roundTo2(value)` | `Math.round(value * 100) / 100` — financial rounding, used on every amount |
| `normalizeHeadPeriod(period)` | Coerces `"month"` / `"MONTH"` to the canonical `"MONTH"` literal |
| `monthLabel(month)` | Maps `5` → `"May"` — used in the ledger display |
| `parseOptionalPositiveInt(value, field)` | Query-string integer parsing with validation |
| `parseOptionalDate(value, field)` | Query-string date parsing with validation |
| `checkRatePeriodCoverage(periods, rateFromDt)` | Returns a warning string when the applied rate is newer than the earliest selected period |

**Why extract helpers?** The service file itself cannot be unit-tested without a real database (or a mock). The helpers have no `import { db }` — they take plain values and return plain values. You can test `roundTo2`, `monthLabel`, `checkRatePeriodCoverage` with zero setup.

### Step 4 — Service (five pre-write checks + derived amounts)

File: `src/modules/contributions/contributions.service.ts`

The `createContribution` function is the most complex write in the system. It runs inside `db.$transaction` with `isolationLevel: "ReadCommitted"` and performs five checks before writing anything:

```
1. validatePeriodRules()       — periods exist, belong to current year, match head period type
2. ensureNoDuplicateContribution() — unit + head + period combination is not already paid
3. deriveQuantity()            — computes quantity based on head.payUnit:
                                  payUnit=1 → sqFt of the unit
                                  payUnit=2 → active resident count at transactionDateTime
                                  payUnit=3 → flat 1
4. find applicableRate         — rate effective at transactionDateTime (not today)
5. compute amounts             — detailAmount = rate × quantity; total = detail × periodCount
```

Only after all five pass does `tx.contribution.create` run, writing both the parent and detail rows in one atomic operation.

**The duplicate check in detail:**
```typescript
// contributions.service.ts — ensureNoDuplicateContribution
const matchedDetails = await tx.contributionDetail.findMany({
  where: {
    contributionPeriodId: { in: contributionPeriodIds },
    contribution: { unitId, contributionHeadId },
  },
  select: { contributionPeriodId: true, amt: true },
});

const netByPeriod = new Map<number, number>();
for (const detail of matchedDetails) {
  const current = netByPeriod.get(detail.contributionPeriodId) ?? 0;
  netByPeriod.set(detail.contributionPeriodId, roundTo2(current + Number(detail.amt)));
}

const lockedPeriodId = contributionPeriodIds.find(
  (periodId) => (netByPeriod.get(periodId) ?? 0) > 0
);
if (lockedPeriodId) throw new HttpError(409, "CONFLICT", `Duplicate contribution...`);
```

**Why sum the amounts, not just count rows?** Because a correction row has negative amounts. A paid-then-corrected period has net zero — and should be payable again. A simple `findFirst` would wrongly block re-payment after a correction.

**Rate locking:**
```typescript
const applicableRate = await tx.contributionRate.findFirst({
  where: {
    contributionHeadId: input.contributionHeadId,
    fromDt: { lte: input.transactionDateTime },
    OR: [{ toDt: null }, { toDt: { gte: input.transactionDateTime } }],
  },
  orderBy: [{ fromDt: "desc" }, { createdAt: "desc" }],
});
```
The rate is looked up at `transactionDateTime`, not at "now". The rate value is stored on the detail row (`appliedRate`). If the rate changes tomorrow, the stored amount does not change — the record is a permanent snapshot.

### Step 5 — Route Handler (carrying the actor)

File: `app/api/contributions/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const auth = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateContributionInput(payload);
    const { contribution, warning } = await createContribution(input, {
      actorUserId: auth.userId,
      actorRole: auth.role,
    });
    return ok(contribution, 201, warning);          // ← third arg is an optional warning
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

**What is new compared to Blocks:**
- `ok(contribution, 201, warning)` — the third argument is an optional warning string. If `checkRatePeriodCoverage` returned a message, it travels through the service and surfaces here. The client receives `{ ok: true, data: {...}, warning: "Rate effective date..." }`. The operation succeeded, but the operator is informed.
- The `actor` object `{ actorUserId, actorRole }` is constructed in the route handler from the result of `requireMutationRole`. Never hardcode or invent actor identity.

### Step 6 — The Corrections Flow (financial immutability)

A posted contribution record is **never edited or deleted**. If it was wrong, a correction is created: a new contribution row with negative amounts, pointing back to the original via `correctionOfContributionId`.

The correction service function (`createContributionCorrection`) checks:
1. The original exists.
2. The original is not itself a correction (you correct originals, not corrections).
3. No active correction already exists (PENDING or POSTED status — REJECTED does not block).
4. The depositor is a valid, non-system individual.

Then it creates the correction row with `amt: -Number(detail.amt)` for each detail row — a precise mirror reversal of the original amounts.

The `MAKER_CHECKER_ENABLED` flag (line 26 of `contributions.service.ts`) controls whether corrections post immediately (`POSTED`) or require a checker approval (`PENDING`). Flip the flag to activate the two-person approval workflow without changing the data model or API shape.

---

## The Pattern, Generalised

To add a new module — say, `ParkingSpace` — follow this checklist in order:

| Step | What to do | Template |
|---|---|---|
| 1 | Add model to `schema.prisma`. Add `@@unique`, `@@index`, and `@@map`. | Block (simple) or ContributionDetail (child of a parent) |
| 2 | Run `npx prisma migrate dev --name add_parking_space` | — |
| 3 | Create `src/modules/parking-spaces/parking-spaces.schemas.ts`. Types + parse functions. Input is `unknown`. | `blocks.schemas.ts` |
| 4 | (Optional) Create `parking-spaces.helpers.ts` for pure functions with no `db` import. | `contributions.helpers.ts` |
| 5 | Create `src/modules/parking-spaces/parking-spaces.service.ts`. `listX`, `getXById`, `createX`, `updateX`, `deleteX`. Import `db` once. Call `writeAuditLog` after writes. | `blocks.service.ts` |
| 6 | Create `app/api/parking-spaces/route.ts`. `GET` + `POST`. | `app/api/blocks/route.ts` |
| 7 | Create `app/api/parking-spaces/[id]/route.ts`. `GET` + `PATCH` + `DELETE`. | `app/api/blocks/[id]/route.ts` |
| 8 | Create `app/(dashboard)/parking-spaces/page.tsx`. `"use client"`. Use `useBrowseState` + `useCrudActions`. | `app/(dashboard)/blocks/page.tsx` |
| 9 | Add to `navigation.ts` — one nav item, specify which roles can see it. | Any existing entry |

### The five questions to answer before writing any code

1. **What are the uniqueness constraints?** Put them in the schema (`@unique`, `@@unique`). Do not write app-level uniqueness checks — let Prisma P2002 → `fromUnknownError` → 409 CONFLICT handle it.
2. **Are there pre-write domain rules?** (Temporal overlap? Referential validation? State machine?) If yes, add private async helper functions inside the service, called inside `$transaction`.
3. **Is the amount derived or user-provided?** If derived, lock it at write time and store it. Never re-derive from current data at read time — rates change.
4. **Can the record be edited or deleted after posting?** If it is financial or auditable, the answer is no. Implement a correction/reversal flow instead of in-place mutation.
5. **Does the operation need two-person approval?** If yes, add a `status` field to the model and a flag in the service. The data model is the same either way.

---

## What changes between a simple and a complex module

| | Simple (Blocks) | Complex (Contributions) |
|---|---|---|
| Schema tables | 1 | 2+ (parent + detail children) |
| Pre-write checks | 0 | 5 |
| Amount derivation | None | `rate × quantity` locked at write time |
| Transaction isolation | Default | Explicit `ReadCommitted` |
| Helpers file | Not needed | Yes — pure functions, unit-tested independently |
| Corrections / reversal | No | Yes — negative detail rows, self-referential FK |
| Maker-checker | No | Flag-gated on/off |
| Warning in response | No | Yes — rate-period coverage advisory |

The six-artefact structure (schema, schemas, service, helpers, route handlers, page) is identical in both cases. Complexity lives inside the service, never in the route handler or the UI.

---

## Recommended Reading Order

| Order | Files to read | Why |
|---|---|---|
| 1 | `prisma/schema.prisma` — Block, Unit, Contribution, ContributionDetail models | Understand the data shape before reading any code |
| 2 | `src/lib/api-response.ts` — `HttpError`, `ok`, `fail`, `fromUnknownError` | All services throw `HttpError`. All handlers call `ok`/`fail`. Read this once. |
| 3 | `src/lib/authz.ts` — `requireReadRole`, `requireMutationRole`, `getAuthContext` | Every route handler starts with one of these. |
| 4 | `src/modules/blocks/blocks.schemas.ts` → `blocks.service.ts` → `app/api/blocks/route.ts` → `app/(dashboard)/blocks/page.tsx` | The full Blocks module, front to back |
| 5 | `src/modules/contributions/contributions.helpers.ts` → `contributions.schemas.ts` → `contributions.service.ts` → `app/api/contributions/route.ts` | The full Contributions module, focusing on the five pre-write checks and the correction flow |
| 6 | `src/lib/audit-log.ts` | Understand why audit writes are outside the transaction |
| 7 | `vault/01-Domain/Domain-Rules.md` | Read the "why" behind the contribution rules after seeing the "how" in the code |

**Estimated time: 3–4 hours** for a complete walkthrough. After this, adding a new module should feel mechanical — pick the right template (simple or complex), answer the five questions, and fill in the six artefacts.
