# Walkthrough — Individuals (PII, Identity, and Cross-Module Dependencies)

Individuals is a simple CRUD module on the surface. What makes it worth a dedicated walkthrough are the concerns it introduces that span the entire application: **PII masking**, **system identity**, and **being the person entity that every other module depends on**.

---

## What an Individual Represents

An `Individual` is any real person in the system — a unit owner, a resident, someone who pays a contribution, or who receives corrections. The same person can be an owner of one unit, a resident of another, and the payer on multiple contributions.

This is why individuals are managed separately rather than inlined into ownerships or contributions. One record, many roles.

---

## The Data Model

```prisma
model Individual {
  id              String    @id @default(uuid())
  fName           String
  mName           String?
  sName           String
  eMail           String    @unique
  mobile          String    @unique
  altMobile       String?
  genderId        Int
  isSystemIdentity Boolean  @default(false)
  systemTag       String?   @unique

  genderType  GenderType   @relation(...)
  ownerships  UnitOwner[]
  residencies UnitResident[]
  // ... contribution references

  @@map("individuals")
}
```

Three fields require attention:

**`eMail @unique` and `mobile @unique`** — uniqueness is enforced at the database level. The service validates format, but the database is the final authority. If a duplicate email is submitted, Prisma throws a constraint error, and `fromUnknownError` in the route handler catches and maps it to a `409 CONFLICT`.

**`isSystemIdentity` and `systemTag`** — these two fields mark internal, machine-managed individuals (currently only `BUILDER_INVENTORY`). They are never shown in the UI or returned by lookup endpoints. All queries that power dropdowns include `where: { isSystemIdentity: false }`.

---

## PII Masking

The most important feature of the Individuals module from a security perspective: **email and mobile are masked for READ_ONLY users**.

```ts
// src/lib/pii-mask.ts

export function maskEmail(email: string | null): string | null {
  if (!email) return email;
  const at = email.indexOf("@");
  return `${email.slice(0, 2)}***@${email.slice(at + 1)}`;
  // "john.smith@example.com" → "jo***@example.com"
}

export function maskMobile(mobile: string | null): string | null {
  if (!mobile) return mobile;
  return `${mobile.slice(0, 3)}***${mobile.slice(-2)}`;
  // "9876543210" → "987***10"
}

export function maskIndividualPii<T extends WithPii>(individual: T, role: UserRole): T {
  if (role === "READ_ONLY") {
    return { ...individual, eMail: maskEmail(individual.eMail), mobile: maskMobile(individual.mobile) };
  }
  return individual;
}
```

Masking happens **in the service layer**, before the data is returned to the route handler. The route handler does not know or care — it receives already-masked data. This is the right place for it: the masking policy is enforced at the same layer as the business logic, not at the UI or the serialisation layer.

Where masking is applied in the service:

```ts
// individuals.service.ts — listIndividuals
const maskedItems = items.map((item) => maskIndividualPii(item, role));
return { items: maskedItems, ... };
```

The `role` parameter is passed in from the route handler, which receives it from `requireReadRole`:

```ts
// app/api/individuals/route.ts
export async function GET(request: NextRequest) {
  const actor = await requireReadRole(request);
  const data = await listIndividuals(request.nextUrl.searchParams, actor.role);
  return ok(data);
}
```

This is an example of the principle: **know who is asking, before deciding what to return**.

---

## Multi-Field Search

The individuals search query uses an `OR` across four columns:

```ts
const where = {
  isSystemIdentity: false,
  ...(q ? {
    OR: [
      { fName: { contains: q, mode: "insensitive" } },
      { sName: { contains: q, mode: "insensitive" } },
      { eMail: { contains: q, mode: "insensitive" } },
      { mobile: { contains: q, mode: "insensitive" } },
    ],
  } : {}),
};
```

A search for "smith" matches anyone whose first name, last name, email, or mobile contains that string. The `mode: "insensitive"` flag uses PostgreSQL's case-insensitive `ILIKE` under the hood.

For performance on large datasets, a full-text index or a combined trigram index (`pg_trgm`) would be more efficient than four separate `ILIKE` conditions. This is noted as a Phase 3 hardening item.

---

## The System Identity Pattern

The `systemTag` field is a stable string identifier for machine-managed individuals. Currently only `BUILDER_INVENTORY` is in use.

Why not use the UUID directly?

```ts
// This is fragile — the ID changes between databases
const builderId = "550e8400-e29b-41d4-a716-446655440000";

// This is stable across all environments
const builder = await db.individual.findUnique({
  where: { systemTag: "BUILDER_INVENTORY" },
});
```

The UUID is generated at seed time and differs between your local database, staging, and production. `systemTag` is a constant in the codebase. Any module that needs to reference a well-known record (builder inventory, future "anonymous payer" if needed, etc.) uses `systemTag`.

The `systemTag` column has a `@unique` constraint, so `findUnique` is safe and type-correct.

---

## Gender Types

Individuals have a `genderId` FK to `GenderType` — a lookup table seeded with Male, Female, Other. The service fetches gender types for the create/update validation path:

```ts
const genderType = await db.genderType.findUnique({ where: { id: genderId } });
if (!genderType) {
  throw new HttpError(404, "NOT_FOUND", "Gender type not found.");
}
```

The UI loads gender types via `GET /api/gender-types` into a dropdown. This is the same pattern as the block lookup used by Units — a separate, small lookup endpoint for driving a form select.

---

## Cross-Module Dependencies

Individuals are referenced by:

| Module | FK | What it represents |
|---|---|---|
| `UnitOwner` | `indId` | The person who owns the unit |
| `UnitResident` | `indId` | The person who lives in the unit |
| `ContributionEntry` | `depositedBy` | The person who physically paid |
| `ContributionCorrection` | (via entry) | The person who paid the corrected record |
| `AppUser` | (separate table) | The system login identity (not the same as Individual) |

Note that `AppUser` (a system login) and `Individual` (a real person) are intentionally separate tables. An `AppUser` is a login credential with a role. An `Individual` is a person entity with contact details. A society admin is both — but a resident who never logs in is only an `Individual`.

This separation keeps the auth model clean. If you merged them, every resident would need a password even if they never log in.

---

## Delete Guard

An individual cannot be deleted if they are referenced by any ownership, residency, or contribution. The database enforces this with `onDelete: Restrict` on the FKs. The service catches the resulting Prisma constraint error and maps it to a meaningful message:

```ts
// fromUnknownError in api-response.ts handles this:
// Prisma error P2003 (foreign key constraint) → 409 CONFLICT
// with message: "This record is referenced by other data and cannot be deleted."
```

Students often ask why there is no application-level check before attempting the delete. The answer: the database check is atomic — it cannot be bypassed by concurrent writes. An application-level pre-check can race. Use the database constraint as the authority and map the error at the application layer.

---

## Things Worth Noticing

**PII masking is at the service layer, not the serialiser.** Moving it to a JSON serialiser or a middleware would make it easier to forget a field. In the service, the masking is adjacent to the query that fetches the data — hard to miss when reading the code.

**`isSystemIdentity: false` in every user-facing query.** This filter is not in a helper or a Prisma middleware — it is spelled out in each query. Explicit over implicit. If you add a new query and forget the filter, you might accidentally expose builder inventory in a dropdown. Keeping the filter visible is a reminder.

**The lookup endpoint returns minimal fields.** `GET /api/individuals?lookup=true` returns only `{ id, fName, mName, sName }` — no email, no mobile, regardless of role. Lookup results power dropdowns; they do not need PII.

**Sort by `sName` then `fName`.** The default sort is a compound sort: last name ascending, then first name ascending. This is how a contact list behaves in any country that names people as "First Last". The Prisma `orderBy` accepts an array for this:

```ts
orderBy: [{ sName: sortDir }, { fName: sortDir }]
```

---

## What to Read Next

- **`src/lib/pii-mask.ts`** — three functions, worth reading in full.
- **`src/modules/ownerships/`** — the first module that depends on individuals. Trace how `indId` flows from the UI lookup dropdown through the API body into the `UnitOwner` row.
- **`prisma/seed.mjs`** — shows how the builder inventory individual is created with a `systemTag` and how gender types are seeded before individuals.
