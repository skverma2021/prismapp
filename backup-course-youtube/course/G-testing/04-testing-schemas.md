# Slide Script — G-04: Testing Schema Parsers

---

## Slide 1 — What a Schema Parser Test Verifies

**Type:** `Concept`

**Headline:**
> Schema parser tests verify two things: valid input is parsed correctly, and invalid input throws the right error.

**Visual / layout:**
Two-column table. Left: "Valid cases — assert the parsed output shape". Right: "Invalid cases — assert that HttpError is thrown with the right status".

**Narration:**
Schema parsers in PrismApp are not Zod schemas — they're manual validation functions that take unknown input and return a typed object. Examples: `parseCreateContributionInput`, `parseCreateContributionCorrectionInput`.

Their contract is:
- **Valid input** → returns a typed object with all expected fields
- **Invalid input** → throws `HttpError` with status `400` and code `VALIDATION_ERROR`

Tests for schema parsers verify both sides:

**Valid side:**
```ts
it("parses a minimal valid payload", () => {
  const result = parseCreateContributionInput(VALID_CONTRIBUTION);
  expect(result.unitId).toBe("unit-abc");
  expect(result.transactionDateTime).toBeInstanceOf(Date);
  expect(result.availingPersonCount).toBeUndefined();
});
```

**Invalid side:**
```ts
it("throws HttpError 400 for missing unitId", () => {
  const { unitId: _omit, ...rest } = VALID_CONTRIBUTION;
  expect(() => parseCreateContributionInput(rest)).toThrow(HttpError);
});
```

Note: the error assertion uses `toThrow(HttpError)` — not `toThrow("some message string")`. Testing the class is more stable than testing the message. Messages can change; the error type contract should not.

**On-screen action / demo:**
Open `contributions.schemas.test.ts`. Show the `VALID_CONTRIBUTION` constant at the top. Then show one valid test and one invalid test side by side.

**Key takeaway:**
Schema tests = two sides. Valid input returns a typed object with correct values. Invalid input throws `HttpError` (by class, not message).

---

## Slide 2 — The Valid Baseline + Mutation Pattern

**Type:** `Code`

**Headline:**
> Define one valid baseline object at the top. Each error test mutates one field — or omits it — to trigger one specific validation.

**Visual / layout:**
Code block: `VALID_CONTRIBUTION` constant. Then three mutations: (1) omit field with destructure, (2) replace field with wrong type, (3) replace field with out-of-range value. Each as a separate `it` block.

**Narration:**
The pattern is consistent across all schema tests:

**Step 1**: Define a valid baseline at the `describe` scope:
```ts
const VALID_CONTRIBUTION = {
  unitId: "unit-abc",
  contributionHeadId: 1,
  contributionPeriodIds: [10],
  transactionId: "TXN-001",
  transactionDateTime: "2026-04-01T10:00:00.000Z",
  depositedBy: "ind-xyz",
};
```

**Step 2**: For each valid case, pass the baseline or an extension of it.

**Step 3**: For each error case, omit or replace exactly one field:

```ts
// Omit a required field:
it("throws HttpError 400 for missing unitId", () => {
  const { unitId: _omit, ...rest } = VALID_CONTRIBUTION;
  expect(() => parseCreateContributionInput(rest)).toThrow(HttpError);
});

// Wrong type:
it("throws HttpError 400 for non-positive contributionHeadId", () => {
  expect(() =>
    parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionHeadId: 0 })
  ).toThrow(HttpError);
});

// Out of range:
it("throws HttpError 400 for empty contributionPeriodIds", () => {
  expect(() =>
    parseCreateContributionInput({ ...VALID_CONTRIBUTION, contributionPeriodIds: [] })
  ).toThrow(HttpError);
});
```

The destructure-to-omit pattern (`const { field: _omit, ...rest } = obj`) is the idiomatic TypeScript way to omit a field from a const object for testing. The `_omit` prefix tells TypeScript (and the linter) that the variable is intentionally unused.

**On-screen action / demo:**
Open `contributions.schemas.test.ts`. Find `VALID_CONTRIBUTION`. Then read five different error test cases — show how each changes exactly one field.

**Key takeaway:**
Valid baseline at the top. Each error test changes exactly one thing. This makes it obvious which validation each test is targeting.

---

## Slide 3 — Asserting Error Properties

**Type:** `Code`

**Headline:**
> `toThrow(HttpError)` checks the class. When you need to verify the status code or error code, use a `try/catch` block.

**Visual / layout:**
Three assertion forms side by side:
1. `expect(() => fn()).toThrow(HttpError)` — class check
2. `expect(() => fn()).toThrow("some message")` — message check (fragile)
3. `try { fn(); expect.fail(...) } catch(e) { expect(e).toBeInstanceOf(HttpError); expect(e.status).toBe(400); }` — full property check

**Narration:**
Most error tests only need to verify the error class:

```ts
expect(() => normalizeHeadPeriod("WEEKLY")).toThrow(HttpError);
```

This confirms that the function throws the right error type — not an unhandled exception, not a different error class.

When you need to verify the status code or error code (useful when a function could throw different `HttpError` instances in different conditions):

```ts
it("error status is 400 and code is VALIDATION_ERROR", () => {
  try {
    ensureNotBeforeUnitInception(d("2026-03-01"), d("2026-02-01"), "Residency start");
    expect.fail("should have thrown");
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    expect((e as HttpError).status).toBe(400);
    expect((e as HttpError).code).toBe("VALIDATION_ERROR");
  }
});
```

Note `expect.fail("should have thrown")` — if the function does NOT throw, this line executes and deliberately fails the test with a clear message. Without it, the `catch` block never runs and the test passes silently even when the function failed to throw.

This is the `residencies.helpers.test.ts` pattern — used when error property verification matters, not just error class.

**On-screen action / demo:**
Open `residencies.helpers.test.ts`. Find the `try/catch` test block for `ensureNotBeforeUnitInception`. Point out `expect.fail(...)` and the cast `(e as HttpError)`.

**Key takeaway:**
`toThrow(HttpError)` for class checks. `try/catch` with `expect.fail` for property checks. Never test error message strings — they're too fragile.
