# Walkthrough — Units (Simple One-to-Many Module)

Units is the cleanest example of the **standard CRUD pattern** in PrismApp. It adds one meaningful layer on top of a flat table (the parent FK to Block) and introduces a small domain edge case (builder inventory). Study it first. Every other module in the app follows the same vertical slice.

---

## Why Units, Not Blocks?

Blocks are simpler than Units — they have no FK, no lookup dependency, and no edge cases. Studying Blocks gives you the pattern but not enough variation to generalise.

Units are the right first stop because they show:
- A parent FK (`blockId`) and the lookup that feeds it in the UI
- A uniqueness constraint that is **within a scope** (description + block, not globally unique)
- A `findFirst` fallback that auto-creates a system identity when none exists (builder inventory)
- URL-driven filters (block filter appears as `?blockId=...` in the browser)

---

## The Data Model

```
Block  1──*  Unit  1──*  UnitOwner  (ownerships)
                    1──*  UnitResident  (residencies)
                    1──*  ContributionDetail  (contributions)
```

The relevant part of `prisma/schema.prisma`:

```prisma
model Unit {
  id          String   @id @default(uuid())
  description String
  blockId     String
  sqFt        Int
  inceptionDt DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  block Block @relation(fields: [blockId], references: [id], onDelete: Restrict)

  @@unique([description, blockId])   // unique within block, not globally
  @@map("units")
}
```

Key observations:
- `@id @default(uuid())` — UUID primary key, not an auto-increment integer. Avoids ID enumeration and works safely across database replicas.
- `onDelete: Restrict` — you cannot delete a Block that still has Units. The database enforces this, not just the application code.
- `@@unique([description, blockId])` — "Unit A-101" is fine, "Unit A-101" in Block A is forbidden a second time, but "Unit A-101" could also appear in Block B. Scoped uniqueness.
- `inceptionDt` — the date the physical unit came into existence. It sets the earliest valid start date for ownership history.

---

## Vertical Slice

```
prisma/schema.prisma          ← data shape + constraints
   ↓
src/modules/units/
  units.schemas.ts            ← parse and validate raw API input
  units.service.ts            ← business logic + database calls
   ↓
app/api/units/
  route.ts                    ← GET (list) + POST (create)
  [id]/route.ts               ← GET (single) + PUT (update) + DELETE
  lookups/route.ts            ← GET (flat list for dropdowns)
   ↓
app/(dashboard)/units/page.tsx  ← client component (the UI)
```

There are no Server Actions here. The UI talks to the API routes via `fetch`. This keeps the page component testable without a Next.js server context.

---

## The Service Layer

`src/modules/units/units.service.ts`

### listUnits

```ts
export async function listUnits(searchParams: URLSearchParams) { ... }
```

Accepts raw `URLSearchParams` directly. No transformation layer between the route handler and the service — the service owns its own parameter parsing via the shared `parseQueryInt` helper.

Four inputs drive the query:
- `q` — case-insensitive substring match on `description`
- `blockId` — exact FK match (filters to one block)
- `sortBy` / `sortDir` — both validated against an allowlist before use

The allowlist check is important:
```ts
if (!["description", "sqFt", "createdAt"].includes(sortBy)) {
  throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
}
```
Without this, an attacker could pass arbitrary field names and cause Prisma to throw internal errors or, worse, sort by a field that exposes schema information. Always validate sort fields explicitly.

The count and list queries run in a single `$transaction` to keep the pagination total consistent with the page items.

### createUnit and the Builder Inventory

When the very first unit is created in the system, there is no owner yet. But the ownership model requires continuity — ownership history must start at the unit's inception date. To satisfy this constraint without requiring the admin to immediately register an owner, `createUnit` auto-creates a **builder inventory** identity if one does not already exist.

```ts
async function ensureBuilderInventoryIdentity(tx) {
  const existing = await tx.individual.findUnique({
    where: { systemTag: "BUILDER_INVENTORY" },
  });
  if (existing) return existing;
  // ... creates the system identity
}
```

The builder inventory is a real row in the `individuals` table, but it has `isSystemIdentity: true` and `systemTag: "BUILDER_INVENTORY"`. The UI filters it out of individual lookups so it never appears in dropdowns. But it satisfies the domain rule that every unit always has an owner from inception.

This is a good example of a **domain invariant being enforced at write time**, not just at read time.

### updateUnit

Update is guarded by two FK-existence checks before writing. If the block or individual referenced in the update does not exist, the service throws a `404 NOT_FOUND` before Prisma has a chance to produce a foreign-key error. This gives the caller a useful message instead of a generic database error.

---

## The Schema (Validation Layer)

`src/modules/units/units.schemas.ts`

```ts
export function parseCreateUnitInput(payload: unknown): CreateUnitInput {
  const record = payload as Record<string, unknown>;
  return {
    description: requireString(record.description, "description"),
    blockId: requireString(record.blockId, "blockId"),
    sqFt: parsePositiveInt(record.sqFt, "sqFt"),
    inceptionDt: parseRequiredDate(record.inceptionDt, "inceptionDt"),
  };
}
```

The schema file has one job: convert `unknown` input into a typed, validated struct. It throws `HttpError(400, "VALIDATION_ERROR", ...)` for any invalid field. The route handler catches this and converts it to a consistent error envelope via `fail(fromUnknownError(...))`.

Notice that there is no Zod here — the project uses hand-written parser functions. The trade-off: more code, but the error messages are exactly what you write, not what a library generates.

---

## The Route Handlers

`app/api/units/route.ts`

```ts
export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listUnits(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateUnitInput(payload);
    const data = await createUnit(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
```

These are intentionally thin. The route handler does three things only:
1. Check the caller's role
2. Delegate to the service
3. Return `ok(data)` or let `fail(fromUnknownError(...))` handle everything else

The `requireMutationRole` call returns an `AuthContext` (containing `actorUserId` and `actorRole`) which is passed to the service — that is how audit log entries know who made the change.

### The Lookup Route

`app/api/units/lookups/route.ts` returns a minimal projection:

```ts
{ id, description, blockId }
```

This endpoint is used by contribution pages and ownership pages that need a flat list of all units for a dropdown. It returns all units (no pagination) but only three fields — avoiding the over-fetch that a full `listUnits` call would produce.

---

## The Page Component

`app/(dashboard)/units/page.tsx`

This is a `"use client"` component. It combines two hooks:

### useBrowseState

```ts
const browse = useBrowseState<UnitItem, SortOption>({
  endpoint: "/api/units",
  errorMessage: "Unable to load units.",
  sortOptions: SORT_OPTIONS,
  defaultSortBy: "description",
  filters: [{ key: "q" }, { key: "blockId" }],
});
```

`useBrowseState` manages:
- Fetching from the API when search params change
- Holding the paginated result (`items`, `totalPages`, `totalItems`)
- Syncing filter/sort/page values to the URL (so back navigation restores state)
- Loading and error states

The URL synchronisation is the key insight: the component does not hold the "current filter" in local state. It reads from and writes to the URL. This means:
- Refresh preserves the user's view
- Back button works correctly
- Deep-linking to a filtered list works

### useCrudActions

```ts
const crud = useCrudActions({
  setSubmitError: browse.setSubmitError,
  setSubmitSuccess: browse.setSubmitSuccess,
});
```

`useCrudActions` provides `crud.create(...)`, `crud.update(...)`, and `crud.remove(...)`. Each method sends the appropriate HTTP verb, handles the loading state, and calls the callbacks on success or error.

### Role guard

```ts
const { session } = useAuthSession();
const canMutate = session.role !== "READ_ONLY";
```

The `canMutate` flag hides the Create, Edit, and Delete buttons from read-only users. **This is a UI convenience, not a security control.** The real guard is `requireMutationRole` in the route handler — if a read-only user crafted a raw HTTP request, the server would reject it with `403`.

UI gating and server-side enforcement must both exist. Removing the UI gating makes the interface confusing but does not open a security hole. Removing the server-side guard while keeping the UI gating is a real vulnerability.

---

## Shared Components

| Component | File | Purpose |
|---|---|---|
| `BrowseFilterBar` | `src/components/master-data/browse-filter-bar.tsx` | Search input, sort dropdown, direction toggle |
| `DataTable` | `src/components/master-data/data-table.tsx` | Renders a list with column headers and row actions |
| `PaginationControls` | `src/components/master-data/pagination-controls.tsx` | Previous/next/page buttons |
| `ContextLinkChips` | `src/components/master-data/context-link-chips.tsx` | "View Ownerships for this Unit" chip links |
| `NoticeStack` | `src/components/master-data/notice-stack.tsx` | Success/error banners |
| `MasterDataNav` | `src/components/master-data/master-data-nav.tsx` | Sidebar navigation breadcrumb |

All CRUD modules in PrismApp use the same set of components. When you understand how Units uses them, Blocks, Individuals, Contribution Heads, and Contribution Periods require no new learning.

---

## Things Worth Noticing

**The `MAX_PAGE_SIZE` guard.** The service refuses requests with `pageSize > 500`. Without this, a caller could ask for all rows in one request, causing a slow query and a large response payload.

**`$transaction` for count + list.** Both queries run atomically. If they ran separately, a concurrent insert could produce a count of 21 but a list of 20 — a pagination total that never resolves correctly.

**`include: { block: true }` on list.** The list query joins the block in the same query rather than issuing N+1 lookups. Each row in the response includes a `block` object: `{ id, description }`.

**Audit log on write.** Every `createUnit`, `updateUnit`, and `deleteUnit` call ends with `writeAuditLog(...)`. The log records the actor, action, entity type, entity ID, and a before/after snapshot. This is how the Audit Log page in the dashboard is populated.

---

## What to Read Next

- **`src/modules/ownerships/`** — same pattern, but with temporal data (date ranges, overlap prevention). The next level of complexity after Units.
- **`src/hooks/use-browse-state.ts`** — read the full hook to understand URL-state synchronisation.
- **`src/lib/api-response.ts`** — the `ok()`, `fail()`, `fromUnknownError()`, and `HttpError` utilities used across every route handler.
- **`course/walkthrough/ownerships.md`** — the timeline module walkthrough.
