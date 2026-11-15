# Speaker Notes — Module G: Testing

These notes are for Camtasia recording. Each note maps to a slide or demo segment. Format: `G-[topic]-[slide]`.

---

## G-01-01 — The Test Pyramid

*[SLIDE: Pyramid diagram — unit / integration / E2E]*

Every project needs a testing strategy.

The common model is the pyramid.

At the bottom are unit tests. They are fast and isolated. They need no database and no network. These are the tests PrismApp has.

In the middle are integration tests. They test the service together with the database. They are slower and need setup. They verify that your code and Postgres produce the right result together.

At the top are E2E tests. A browser drives the full app. They are the most realistic, but also the slowest and the most fragile.

PrismApp focuses on the bottom of the pyramid.

The riskiest pure logic lives in functions that do not need a database to test. That logic includes financial calculations, overlap detection, and input validation.

[Show terminal] `npm run test` — 5 files, passing, under a second.

---

## G-01-02 — What Makes a Function Worth Testing?

*[SLIDE: Three categories table]*

There are three signals that a function is worth testing.

**Multiple valid behaviours.** `normalizeHeadPeriod` accepts `MONTH`, `month`, `Month`, `  MONTH  `. All of them must return `"MONTH"`.

A change that breaks case handling would silently affect database values.

**Known error cases.** `parseContributionId` must throw on `"0"`, `"-5"`, `"abc"`. If it accepts these, invalid IDs reach the DB.

**Trusted output.** `roundTo2` feeds the payment write path and the reports. Wrong output means wrong amounts in two places.

[Show test file] Open `contributions.helpers.test.ts`. The `roundTo2` describe block — read the IEEE 754 comment. That comment exists because someone thought about the edge case carefully.

---

## G-01-03 — What PrismApp Doesn't Test

*[SLIDE: Tested vs Not tested table]*

Service functions are not unit tested, because they call Prisma.

You can mock Prisma with `vi.mock`. But then you test that your code calls the mock correctly. You do not test that your code and Postgres produce the right result.

Route handlers are not unit tested either. They need a `NextRequest` object and the Next.js runtime.

This does not mean those tests are bad ideas. They belong to a different category, called integration tests. They have a higher setup cost.

For V1, PrismApp tests the code that is cheapest to test and highest in risk.

That is the right trade-off.

---

## G-02-01 — The Config File

*[SLIDE: Annotated vitest.config.ts]*

The config file is 20 lines. Every line matters.

`environment: "node"` means there is no DOM and no window. It is for server-side logic only. To test React components, you would use `"jsdom"`.

`include: ["src/**/__tests__/**/*.test.ts"]` picks up only files inside a `__tests__` folder. Files in `app/` or `prisma/` are not picked up.

`coverage.provider: "v8"` is the coverage engine built into Node. It adds zero extra dependencies.

`resolve.alias: { "@": project root }` is the same `@` alias used in source code. Test imports and source imports stay consistent.

[Show VS Code] Open `vitest.config.ts`. Read each field.

---

## G-02-02 — Where Tests Live

*[SLIDE: Directory tree]*

Tests live next to the source they test.

Each module folder has a `__tests__/` subdirectory. The test filename is the source filename plus `.test.ts`.

`contributions.helpers.test.ts` tests `contributions.helpers.ts`. There is no ambiguity.

This is intentional. When you change a function, you know exactly where its tests are.

[Show Explorer] Navigate `src/modules/contributions/`. Expand `__tests__/`. Show both test files. Then show `src/modules/ownerships/__tests__/`.

---

## G-02-03 — Running Tests

*[SLIDE: Three commands]*

`npm run test` runs a single pass. Exit code 0 means all tests pass. Use this in CI.

`npm run test:watch` starts watch mode. When you edit a file, Vitest re-runs only the affected tests. Use this during development.

`npx vitest run --coverage` generates a coverage report. The HTML goes in `coverage/`. It shows which lines were hit.

[Demo] Run `npm run test`. Read the output: file count, test count, duration. Then run watch mode — save a file and watch the re-run.

---

## G-03-01 — Anatomy of a Helper Test File

*[SLIDE: Annotated test file structure]*

The file has three import groups. First come the vitest test functions. Then `HttpError`. Then the functions under test.

After the imports come the `describe` blocks, one per function. `describe` holds the function name. `it` describes one behaviour.

Together they read as a sentence.

For example: "roundTo2 rounds to 2 decimal places."

[VS Code] Open `contributions.helpers.test.ts`. Collapse all `describe` blocks. The file outline is a list of function names.

---

## G-03-02 — The `d()` Date Helper

*[SLIDE: Before/after with d() helper]*

Some tests need many `Date` objects. A small local factory makes them readable.

```ts
const d = (iso: string) => new Date(iso + "T00:00:00.000Z");
```

It is defined inside the `describe` block. It is not exported. It exists only to keep test cases clean.

The `T00:00:00.000Z` suffix forces UTC midnight.

PrismApp uses this convention for date-only fields throughout.

[VS Code] Open `ownerships.helpers.test.ts`. Show `const d = ...`. Count how many times it's used. Then show what one test would look like without it.

---

## G-03-03 — Overlap Boundary Cases

*[SLIDE: Three boundary timeline diagrams]*

Overlap logic fails at the edges. There are three cases.

Case one is adjacent ranges. A ends Jan 31 and B starts Feb 1. They do NOT overlap, so this is allowed.

Case two is a same-day boundary. A ends Jan 31 and B starts Jan 31. They DO overlap, so this is not allowed.

Case three is an open-ended range. A starts in Jan and has no end. It overlaps with anything that starts after Jan.

Suppose the implementation uses `>` instead of `>=` for the same-day check. Then a same-day boundary is silently accepted, just like an adjacent range.

The test catches that.

[VS Code] Open `ownerships.helpers.test.ts`. Read the three boundary test cases with their comments.

---

## G-04-01 — What a Schema Parser Test Verifies

*[SLIDE: Valid vs Invalid columns]*

Schema parsers have two sides.

Valid input returns a typed object with correct values. Invalid input throws `HttpError`.

Tests verify both sides. For the error side, use `expect(() => fn()).toThrow(HttpError)`. This checks the class, not the message.

Messages can change in a refactor. The error type contract should not change.

Test what matters.

[VS Code] Open `contributions.schemas.test.ts`. Show one valid test and one invalid test.

---

## G-04-02 — Valid Baseline + Mutation Pattern

*[SLIDE: VALID_CONTRIBUTION constant + three mutation tests]*

Define one valid object at the top of the `describe`. Each error test changes or removes exactly one field.

```ts
const VALID_CONTRIBUTION = { unitId: "...", ... };

// Omit: destructure-to-remove
const { unitId: _omit, ...rest } = VALID_CONTRIBUTION;

// Replace: spread with override
{ ...VALID_CONTRIBUTION, contributionHeadId: 0 }
```

The `_omit` prefix tells the linter that the variable is intentionally unused.

[VS Code] Find `VALID_CONTRIBUTION`. Count the error tests — each changes exactly one field.

---

## G-04-03 — Asserting Error Properties

*[SLIDE: Three assertion forms]*

`toThrow(HttpError)` is a class check. Most tests use this.

Use `try { fn(); expect.fail("should have thrown") } catch(e) { ... }` when you need to check `e.status` or `e.code`.

`expect.fail(...)` is critical.

If the function does NOT throw, this line runs and fails the test with a clear message. Without it, the catch block never runs. The test then passes silently when it should fail.

[VS Code] Open `residencies.helpers.test.ts`. Find the `try/catch` block for `ensureNotBeforeUnitInception`. Point out `expect.fail`.

---

## G-05-01 — Why Service Functions Aren't Tested

*[SLIDE: Service → Prisma → DB diagram with vi.mock annotation]*

Service functions call Prisma. `vi.mock` can replace `db` with a stub. Then the function runs without a database.

But now you test that your code calls the mock correctly. You do not test that your code and Postgres produce the right result.

For financial writes, you want the database constraint to fire. That includes duplicate prevention, timeline overlap, and the correction flow. It is not enough that the service code attempts the right call.

That is integration testing, not unit testing.

---

## G-05-02 — How `vi.mock` Works

*[SLIDE: Minimal mock service test code]*

`vi.mock("@/src/lib/db", () => ({ db: { contribution: { create: vi.fn() } } }))` replaces the db module for this test file.

It must be at the top level. Vitest hoists it above the imports.

`beforeEach(() => vi.clearAllMocks())` resets the call history between tests.

`mockResolvedValue(...)` controls what the mock returns.

`toHaveBeenCalledWith(...)` asserts that the mock was called with the right arguments.

This is the pattern. PrismApp does not use it today, but it is ready for integration test expansion.

---

## G-05-03 — When to Add Integration Tests

*[SLIDE: Decision tree — unit vs integration]*

Add integration tests when correctness depends on the database constraint, not only on application logic.

Take the `rangesOverlap` logic. It is pure math, so a unit test is enough.

Take overlap rejected on write. The service and the DB constraint must both fire correctly, so it needs an integration test.

Take the correction flow. It makes multiple writes in sequence, and rollback behaviour matters. It also needs an integration test.

The setup has four steps. Create a test database. Run `prisma migrate deploy`. Seed minimal data. Run the service against the real DB.

PrismApp does not have these tests yet.

They are the natural next step for the contribution module's hardening phase.

---

## G-06-01 — Module Wrap-Up

*[SLIDE: Summary — five test files, three patterns, one config]*

Module G covered five topics.

First, why PrismApp tests helpers and parsers, not services. Pure functions need no database. Services depend on one.

Second, `vitest.config.ts`. We covered every field and the co-location convention.

Third, helper tests. We covered the `describe`/`it` structure, the `d()` date factory, and the focus on boundary cases.

Fourth, schema parser tests. We covered the valid baseline with mutation, and `toThrow(HttpError)` versus `try/catch`.

Fifth, mock strategy. `vi.mock` is for service tests. Logic that depends on the database belongs to integration tests.

The exercise asks you to write a new test file for the report param parsers. You will apply everything from this module.

The next module is **H: Deployment**.

It covers running PrismApp on Vercel with a hosted Postgres database.
