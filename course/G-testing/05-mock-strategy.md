# Slide Script — G-05: Mock Strategy

---

## Slide 1 — Why Service Functions Aren't Tested

**Type:** `Concept`

**Headline:**
> Service functions call Prisma. To unit test them, you must mock the database — and that mock is not the database.

**Visual / layout:**
Diagram: `contributions.service.ts` → `db.contribution.create(...)` → PostgreSQL. Arrow from `db` with label "vi.mock replaces this". Below: note saying "You're now testing that your code calls the mock correctly — not that it produces correct DB results."

**Narration:**
Every service function in PrismApp begins or ends with a Prisma call:

```ts
const contribution = await db.contribution.create({ data: { ... } });
```

To unit test `createContribution`, you'd need `db` to not be a real database connection. Vitest's `vi.mock` can replace the module:

```ts
vi.mock("@/src/lib/db", () => ({
  db: {
    contribution: {
      create: vi.fn().mockResolvedValue({ id: 1, ... }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  },
}));
```

This works — the function can be called without a database.

But now the test verifies something weaker: that your service code calls `db.contribution.create` with the right arguments and handles the mock's return value. It does NOT verify that the actual SQL query, indexes, constraints, and Prisma transformation behave correctly with real data.

For financial logic — duplicate prevention, timeline overlap, immutability enforcement — you want to know the database constraint fires, not just that the service code attempts to call the right Prisma method.

That's an integration test, not a unit test.

**On-screen action / demo:**
Open `contributions.service.ts`. Show any function that calls `db.*`. Then show `src/lib/db.ts` — the Prisma singleton. Explain: `vi.mock("@/src/lib/db")` would replace this module during test runs.

**Key takeaway:**
`vi.mock` replaces the module. The test runs without a database. But it tests the mock interaction — not the real database behaviour. Know the difference.

---

## Slide 2 — How `vi.mock` Works

**Type:** `Code`

**Headline:**
> `vi.mock` replaces a module with a stub before any test in the file runs. It must be at the top level of the file.

**Visual / layout:**
Code block showing a full minimal service test file with `vi.mock`. Annotations: (1) `vi.mock` placement, (2) `beforeEach(() => vi.clearAllMocks())`, (3) accessing the mock in the test, (4) asserting `toHaveBeenCalledWith`.

**Narration:**
If you were writing a service test, the structure would look like this:

```ts
import { vi, describe, it, expect, beforeEach } from "vitest";

// Must be at the top level — not inside describe or it
vi.mock("@/src/lib/db", () => ({
  db: {
    contribution: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Import the module AFTER vi.mock — Vitest hoists the mock
import { db } from "@/src/lib/db";
import { createContribution } from "../contributions.service";

describe("createContribution", () => {
  beforeEach(() => {
    vi.clearAllMocks(); // reset call history between tests
  });

  it("calls db.contribution.create with the right args", async () => {
    (db.contribution.findFirst as ReturnType<typeof vi.fn>)
      .mockResolvedValue(null); // no duplicate found
    (db.contribution.create as ReturnType<typeof vi.fn>)
      .mockResolvedValue({ id: 1 });

    await createContribution({ ... });

    expect(db.contribution.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ unitId: "unit-abc" }) })
    );
  });
});
```

Key points:
- `vi.mock` is **hoisted** by Vitest to the top of the file regardless of where you write it. This is unlike regular code.
- `beforeEach(() => vi.clearAllMocks())` resets call counts and mock return values between tests. Without this, a `mockResolvedValue` set in test 1 can affect test 2.
- `expect(fn).toHaveBeenCalledWith(...)` checks that the mock was called with specific arguments.
- `expect.objectContaining(...)` does partial matching — you don't need to specify every field, only the ones you care about.

**On-screen action / demo:**
This is a conceptual demo — no file to show. Draw the structure on screen or walk through the code block. Point out the hoisting note.

**Key takeaway:**
`vi.mock` at top level, hoisted. `beforeEach(vi.clearAllMocks)` to reset. `mockResolvedValue` to control return. `toHaveBeenCalledWith` to assert calls.

---

## Slide 3 — When to Add Integration Tests

**Type:** `Concept`

**Headline:**
> Add integration tests when the correctness of the system depends on the database constraint, not just on the application logic.

**Visual / layout:**
Decision tree: "Does the test require a DB response to be meaningful?" → Yes → Integration test. No → Unit test. Examples: "rangesOverlap logic" → No (pure math). "Overlap rejected on write" → Yes (DB constraint + service logic together).

**Narration:**
The unit tests in PrismApp test the logic that runs before and after the database call: validation, computation, normalisation. For those, the database is irrelevant.

Integration tests would cover: what happens when a duplicate contribution is attempted? The service has code to prevent it, but there's also a unique constraint in the database. Which one fires first? Does the service return the right error response? Does the correction flow work end-to-end?

To set up integration tests you would:
1. Create a test database (a separate schema in Postgres, or a Docker container)
2. Run migrations against it: `prisma migrate deploy`
3. Seed minimal required data (heads, periods, units) before each test
4. Run the service functions against the real DB
5. Assert on returned values and (optionally) query the DB directly to verify state

Vitest supports this pattern with `beforeAll`/`afterAll` hooks for setup/teardown.

PrismApp doesn't have these tests yet. They're a natural next step as the contribution module matures — especially for the correction/reversal flow and the duplicate prevention logic, where the interaction between service logic and database constraints must both be correct.

**On-screen action / demo:**
Open `vault/00-Core/ADR-001-Data-Immutability-and-Corrections.md` briefly. Point out that the correction flow involves multiple database writes in a specific order — exactly the kind of scenario integration tests would verify.

**Key takeaway:**
Integration tests = service + real database. They verify the interaction between application logic and database constraints. They're the next step after unit tests for PrismApp's financial module.
