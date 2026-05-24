# Speaker Notes — Module G: Testing

These notes are for Camtasia recording. Each note maps to a slide or demo segment. Format: `G-[topic]-[slide]`.

---

## G-01-01 — The Test Pyramid

*[SLIDE: Pyramid diagram — unit / integration / E2E]*

Every project needs a testing strategy. The common model is the pyramid.

Bottom: unit tests — fast, isolated, no database, no network. These are the ones PrismApp has.

Middle: integration tests — service plus database. Slower. Need setup. Verify that the combination of your code and Postgres produces the right result.

Top: E2E tests — browser driving the full app. Most realistic. Slowest. Most brittle.

PrismApp focuses on the bottom. The riskiest pure logic — financial calculations, overlap detection, input validation — lives in functions that don't need a database to test.

[Show terminal] `npm run test` — 5 files, passing, under a second.

---

## G-01-02 — What Makes a Function Worth Testing?

*[SLIDE: Three categories table]*

Three signals that a function is worth testing:

**Multiple valid behaviours**: `normalizeHeadPeriod` accepts `MONTH`, `month`, `Month`, `  MONTH  `. All must return `"MONTH"`. A change that breaks case handling would silently affect database values.

**Known error cases**: `parseContributionId` must throw on `"0"`, `"-5"`, `"abc"`. If these are accepted, invalid IDs reach the DB.

**Trusted output**: `roundTo2` feeds the payment write path and the reports. Wrong output = wrong amounts in two places.

[Show test file] Open `contributions.helpers.test.ts`. The `roundTo2` describe block — read the IEEE 754 comment. That comment exists because someone thought about the edge case carefully.

---

## G-01-03 — What PrismApp Doesn't Test

*[SLIDE: Tested vs Not tested table]*

Service functions aren't unit tested — they call Prisma. You can mock Prisma with `vi.mock`, but then you're testing that your code calls the mock correctly — not that your code plus Postgres produces the right result.

Route handlers aren't unit tested — they need a `NextRequest` object and the Next.js runtime.

This doesn't mean those tests are bad ideas. It means they're a different category — integration tests — with higher setup cost.

For V1, PrismApp tests the cheapest-to-test, highest-risk code. That's the right trade-off.

---

## G-02-01 — The Config File

*[SLIDE: Annotated vitest.config.ts]*

20 lines. Every line matters.

`environment: "node"` — no DOM, no window. Server-side logic only. If you were testing React components, this would be `"jsdom"`.

`include: ["src/**/__tests__/**/*.test.ts"]` — only files inside a `__tests__` folder. Files in `app/` or `prisma/` are not picked up.

`coverage.provider: "v8"` — Node's built-in coverage engine. Zero extra dependencies.

`resolve.alias: { "@": project root }` — the same `@` alias used in source code. Test imports and source imports are consistent.

[Show VS Code] Open `vitest.config.ts`. Read each field.

---

## G-02-02 — Where Tests Live

*[SLIDE: Directory tree]*

Tests are co-located with the source they test. Each module folder has a `__tests__/` subdirectory. Test filename = source filename + `.test.ts`.

`contributions.helpers.test.ts` tests `contributions.helpers.ts`. No ambiguity.

This is intentional — when you modify a function, you know exactly where its tests are.

[Show Explorer] Navigate `src/modules/contributions/`. Expand `__tests__/`. Show both test files. Then show `src/modules/ownerships/__tests__/`.

---

## G-02-03 — Running Tests

*[SLIDE: Three commands]*

`npm run test` — single pass. Exit code 0 = all pass. Use this in CI.

`npm run test:watch` — watch mode. Edit a file, Vitest re-runs only affected tests. Use this during development.

`npx vitest run --coverage` — generates a coverage report. HTML in `coverage/`. Shows which lines were hit.

[Demo] Run `npm run test`. Read the output: file count, test count, duration. Then run watch mode — save a file and watch the re-run.

---

## G-03-01 — Anatomy of a Helper Test File

*[SLIDE: Annotated test file structure]*

Three import groups: vitest test functions, `HttpError`, then the functions under test.

Then `describe` blocks — one per function. `describe` holds the function name. `it` describes one behaviour.

Together they read as a sentence: "roundTo2 rounds to 2 decimal places."

[VS Code] Open `contributions.helpers.test.ts`. Collapse all `describe` blocks. The file outline is a list of function names.

---

## G-03-02 — The `d()` Date Helper

*[SLIDE: Before/after with d() helper]*

When tests need many `Date` objects, a local inline factory makes them readable.

```ts
const d = (iso: string) => new Date(iso + "T00:00:00.000Z");
```

Defined inside the `describe` block. Not exported. Exists only to clean up test cases.

The `T00:00:00.000Z` suffix forces UTC midnight — the convention PrismApp uses for date-only fields throughout.

[VS Code] Open `ownerships.helpers.test.ts`. Show `const d = ...`. Count how many times it's used. Then show what one test would look like without it.

---

## G-03-03 — Overlap Boundary Cases

*[SLIDE: Three boundary timeline diagrams]*

Overlap logic fails at the edges. Three cases:

1. **Adjacent** (A ends Jan 31, B starts Feb 1) — NOT overlapping. Allowed.
2. **Same-day boundary** (A ends Jan 31, B starts Jan 31) — IS overlapping. Not allowed.
3. **Open-ended range** (A starts Jan, no end) — overlaps with anything starting after Jan.

If the implementation uses `>` instead of `>=` for the same-day check, adjacent-is-fine silently becomes same-day-is-fine-too. The test catches that.

[VS Code] Open `ownerships.helpers.test.ts`. Read the three boundary test cases with their comments.

---

## G-04-01 — What a Schema Parser Test Verifies

*[SLIDE: Valid vs Invalid columns]*

Schema parsers have two sides:

Valid input → returns a typed object with correct values.
Invalid input → throws `HttpError`.

Tests verify both. For the error side: `expect(() => fn()).toThrow(HttpError)`. Not the message — the class.

Messages can change in a refactor. The error type contract should not. Test what matters.

[VS Code] Open `contributions.schemas.test.ts`. Show one valid test and one invalid test.

---

## G-04-02 — Valid Baseline + Mutation Pattern

*[SLIDE: VALID_CONTRIBUTION constant + three mutation tests]*

Define one valid object at the top of the `describe`. Each error test mutates or removes one field.

```ts
const VALID_CONTRIBUTION = { unitId: "...", ... };

// Omit: destructure-to-remove
const { unitId: _omit, ...rest } = VALID_CONTRIBUTION;

// Replace: spread with override
{ ...VALID_CONTRIBUTION, contributionHeadId: 0 }
```

`_omit` prefix tells the linter the variable is intentionally unused.

[VS Code] Find `VALID_CONTRIBUTION`. Count the error tests — each changes exactly one field.

---

## G-04-03 — Asserting Error Properties

*[SLIDE: Three assertion forms]*

`toThrow(HttpError)` — class check. Most tests use this.

`try { fn(); expect.fail("should have thrown") } catch(e) { ... }` — use when you need to check `e.status` or `e.code`.

`expect.fail(...)` is critical: if the function does NOT throw, this line runs and fails the test with a clear message. Without it, the catch block never runs and the test silently passes when it shouldn't.

[VS Code] Open `residencies.helpers.test.ts`. Find the `try/catch` block for `ensureNotBeforeUnitInception`. Point out `expect.fail`.

---

## G-05-01 — Why Service Functions Aren't Tested

*[SLIDE: Service → Prisma → DB diagram with vi.mock annotation]*

Service functions call Prisma. `vi.mock` can replace `db` with a stub. The function runs without a database.

But now you're testing that your code calls the mock correctly. Not that your code plus Postgres produces the right result.

For financial writes — duplicate prevention, timeline overlap, correction flow — you want the database constraint to fire, not just the service code to attempt the right call.

That's integration testing. Not unit testing.

---

## G-05-02 — How `vi.mock` Works

*[SLIDE: Minimal mock service test code]*

`vi.mock("@/src/lib/db", () => ({ db: { contribution: { create: vi.fn() } } }))` replaces the db module for this test file.

Must be at top level — Vitest hoists it above imports.

`beforeEach(() => vi.clearAllMocks())` resets call history between tests.

`mockResolvedValue(...)` controls what the mock returns.

`toHaveBeenCalledWith(...)` asserts the mock was called with the right arguments.

This is the pattern — not in PrismApp today, but ready for integration test expansion.

---

## G-05-03 — When to Add Integration Tests

*[SLIDE: Decision tree — unit vs integration]*

Add integration tests when correctness depends on the database constraint, not just application logic.

- `rangesOverlap` logic — unit test. It's pure math.
- Overlap rejected on write — integration test. Service + DB constraint must both fire correctly.
- Correction flow — integration test. Multiple writes in sequence; rollback behaviour matters.

Setup: test database, `prisma migrate deploy`, seed minimal data, run service against real DB.

PrismApp doesn't have these yet. They're the natural next step for the contribution module's hardening phase.

---

## G-06-01 — Module Wrap-Up

*[SLIDE: Summary — five test files, three patterns, one config]*

Module G covered:

- Why PrismApp tests helpers and parsers, not services (pure functions vs DB dependency)
- `vitest.config.ts` — every field, co-location convention
- Helper tests: `describe`/`it` structure, the `d()` date factory, boundary case focus
- Schema parser tests: valid baseline + mutation, `toThrow(HttpError)` vs `try/catch`
- Mock strategy: `vi.mock` for service tests, integration test territory for DB-dependent logic

The exercise asks you to write a new test file for the report param parsers — applying everything from this module.

Next module is **H: Deployment** — running PrismApp on Vercel with a hosted Postgres database.
