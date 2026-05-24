# Module Outline — G: Testing

## Identity

| Field | Value |
|---|---|
| Section | G — Testing |
| Target audience | Final-year CS / IT students; early-career developers |
| Prerequisites | Sections A–F (domain, setup, CRUD, hardening, reporting) |
| Estimated duration | 50–60 minutes |
| Companion project | PrismApp — Society Management System |

---

## Purpose

Production code without tests is fragile. Every refactor, every new feature, every Prisma migration risks silently breaking existing behaviour.

PrismApp uses Vitest to test the parts of the codebase that most need protection: pure business logic functions and input validation schemas. These are the functions that silently return wrong answers — or wrong errors — when their behaviour drifts.

This module explains:
- What is worth testing in a Next.js + Prisma project
- How the existing tests are structured and why
- How to write new tests following the same patterns
- The limits of unit testing (and where integration tests would help)

---

## Learning Objectives

By the end of this module, the student will be able to:

1. Explain why PrismApp tests helper functions and schema parsers rather than service functions or route handlers.
2. Read the `vitest.config.ts` file and explain what `environment`, `include`, `coverage`, and the `@` alias each do.
3. Write a `describe` / `it` / `expect` test for a pure function, following the arrange–act–assert structure.
4. Test a function that throws `HttpError` using `expect(() => fn()).toThrow(HttpError)`.
5. Write schema parser tests using the "valid baseline object + mutation" pattern.
6. Describe what would be required to test a service function that calls Prisma, and where `vi.mock` fits in.

---

## Module Structure

| # | Topic file | Slide group title | Duration (est.) |
|---|---|---|---|
| 1 | `01-what-to-test.md` | The test pyramid in a Next.js project | 7 min |
| 2 | `02-vitest-setup.md` | Vitest config, project structure, running tests | 8 min |
| 3 | `03-testing-helpers.md` | Testing pure functions — helpers and date utilities | 10 min |
| 4 | `04-testing-schemas.md` | Testing schema parsers — valid baseline + mutation | 10 min |
| 5 | `05-mock-strategy.md` | Testing with mocks — when and how to use `vi.mock` | 8 min |
| 6 | `06-testing-exercise.md` | Hands-on: write tests for a new helper and a schema parser | 10 min |

---

## Key Files

| File | Role |
|------|------|
| `vitest.config.ts` | Vitest configuration: environment, include pattern, coverage, alias |
| `src/modules/contributions/__tests__/contributions.helpers.test.ts` | Tests for `roundTo2`, `monthLabel`, `normalizeHeadPeriod`, `parseContributionId` |
| `src/modules/contributions/__tests__/contributions.schemas.test.ts` | Tests for `parseCreateContributionInput`, `parseCreateContributionCorrectionInput` |
| `src/modules/ownerships/__tests__/ownerships.helpers.test.ts` | Tests for `rangesOverlap`, `addDays`, `ensureNotBeforeUnitInception` |
| `src/modules/residencies/__tests__/residencies.helpers.test.ts` | Tests for `rangesOverlap` (residency flavour), `ensureNotBeforeUnitInception` |
| `src/lib/api-response.ts` | Defines `HttpError` — imported in every test |

---

## Key Concepts

| Concept | Where it appears |
|---------|-----------------|
| Pure function | A function with no side effects — same inputs always produce same outputs. All tested functions qualify. |
| `HttpError` as the test target | Validation functions throw `HttpError` on bad input. Tests assert the type, not a string message. |
| Valid baseline + mutation | Schema parser tests start with a known-good object, then mutate one field to trigger a specific error. |
| `describe` / `it` nesting | `describe` names the function; `it` names one behaviour. Nesting shows scope. |
| `vitest run` vs `vitest` | One-shot (CI) vs watch mode (development). |
| `vi.mock` | Replaces a module import with a stub during test runs. Used for service-level testing with Prisma. |

---

## Scope: What PrismApp Tests and Why

The five existing test files cover:
- `roundTo2` — financial rounding (wrong rounding = wrong amounts)
- `monthLabel`, `normalizeHeadPeriod` — data normalisation (wrong output = wrong period labels stored in DB)
- `parseContributionId`, `parseOptionalPositiveInt`, `parseOptionalDate` — URL param parsing (wrong parse = wrong query or crash)
- `rangesOverlap`, `addDays`, `ensureNotBeforeUnitInception` — timeline overlap detection (wrong logic = data integrity failure)
- `parseCreateContributionInput`, `parseCreateContributionCorrectionInput` — schema parsing (wrong validation = corrupt records)

Not tested (service functions, route handlers) — these require a running database or deep mocking. They are integration test territory.

---

## Definition of Done for This Module

1. Student can run `npm run test` and explain the output (test count, pass/fail, duration).
2. Student can add a new `it(...)` block to an existing test file and it runs.
3. Student can write a test for a function that throws `HttpError` on invalid input.
4. Student can describe where service-function tests would live and what mocking they'd need.
