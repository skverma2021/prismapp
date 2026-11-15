# Slide Script — G-01: What to Test

---

## Slide 1 — The Test Pyramid in a Next.js Project

**Type:** `Concept`

**Headline:**
> Three layers. Unit tests are cheap and fast. Integration tests are expensive. PrismApp focuses on the middle — pure logic.

**Visual / layout:**
Pyramid diagram. Bottom tier (wide): "Unit tests — pure functions, helpers, validators". Middle tier: "Integration tests — service + DB, route handler + request". Top tier (narrow): "E2E tests — browser + full stack". Annotation: "PrismApp covers: bottom + limited middle".

**Narration:**
Every project needs a testing strategy. One common model is the test pyramid.

**Unit tests** sit at the bottom. They are fast, cheap, and completely isolated. They use no database, no HTTP, and no filesystem. You pass a value in and check a value out.

**Integration tests** test a combination of components. Often this is a service function plus a real database. Or it is a route handler plus a simulated HTTP request. They are slower and need more setup.

**E2E tests** drive a real browser through real user flows. They catch the most real-world bugs. But they are the slowest and the most fragile.

PrismApp has five unit test files. They cover pure functions and input parsers.

There are no integration or E2E tests. This is not because they are unimportant. The highest-risk code lives in pure functions. This includes financial calculations, overlap detection, and input validation. These functions do not need a database to test.

The tests that exist protect the code that most needs protection.

**On-screen action / demo:**
Open `src/modules/contributions/__tests__/`. Show the three files. Run `npm run test` and show the terminal output — test count, duration, pass/fail.

**Key takeaway:**
Test the riskiest pure logic first. Add integration tests when the complexity of service+DB interactions warrants it.

---

## Slide 2 — What Makes a Function Worth Testing?

**Type:** `Concept`

**Headline:**
> A function worth testing has: multiple valid behaviours, known error cases, or output that downstream code trusts without question.

**Visual / layout:**
Three categories in a table: "Multiple valid outputs" (example: `normalizeHeadPeriod` — accepts uppercase, lowercase, mixed), "Known error cases" (example: `parseContributionId` — must throw on 0, negative, non-numeric), "Trusted output" (example: `roundTo2` — amounts written to DB depend on this being right).

**Narration:**
Not every function needs a test. A function that passes a value through has little logic to verify. The same is true for a function that calls one other function.

A function is worth testing in three cases.

**It has multiple valid behaviours.** `normalizeHeadPeriod` accepts `"MONTH"`, `"month"`, `"Month"`, and `"  MONTH  "` with whitespace. All of them must return `"MONTH"`. A change that breaks case-insensitive handling would silently affect UI dropdowns and database values.

**It has known error cases that must fire.** `parseContributionId` must throw on `"0"`, `"-5"`, `"abc"`, and an empty string. If any of these is silently accepted, an invalid ID reaches the database query.

**Downstream code trusts its output.** `roundTo2` is called in the payment write path. It is also called in the expected-amount calculation. If it returns the wrong value, amounts are wrong in both payment records and reports.

A test confirms it behaves correctly for edge cases. One example is `1.005`. This value rounds differently because of the IEEE 754 representation.

**On-screen action / demo:**
Open `contributions.helpers.test.ts`. Point to the `roundTo2` tests. Read the comment about `1.005` — it explains exactly why the test exists.

**Key takeaway:**
Test functions with multiple valid paths, known error cases, or output that other code depends on without verification.

---

## Slide 3 — What PrismApp Doesn't Test (and Why)

**Type:** `Concept`

**Headline:**
> Service functions and route handlers aren't unit tested because they require either a database or deep mocking — neither fits a fast unit test.

**Visual / layout:**
Table: "Tested" (helpers, parsers) vs "Not unit tested" (service functions, route handlers, UI components). Third column: "Why". For services: "Requires running DB or Prisma mock". For route handlers: "Requires Next.js request/response simulation". For UI: "Requires JSDOM/browser environment".

**Narration:**
Look at any service function, such as `createContribution` or `getContributionTransactionsReport`. They call `db.something.findMany(...)`. You cannot run that in a unit test. You need either a real database or a mock of Prisma.

A Prisma mock is possible with `vi.mock`. But then you test that your code calls the mock correctly. You do not test that your query and the database produce the right result together. For that, you need an integration test against a real test database.

Route handlers have a similar problem. They need a `NextRequest` object. They also need a way to simulate the Next.js runtime.

UI component tests need JSDOM, which is a browser simulation in Node. These tests break easily when components change.

**None of this means you should not have these tests.** It means they are a different category with a higher setup cost.

For V1, PrismApp tests the code that is cheapest to test. It also tests the code that is highest-risk if wrong. That code is the pure logic functions.

When you are ready to add integration tests, start a test database. Use a separate schema or container. Run migrations against it, and run the service tests in that environment.

**On-screen action / demo:**
Open `src/modules/contributions/contributions.service.ts`. Show the Prisma calls. Then show `db.ts` — the singleton. Point out: to unit test this, you'd need to replace `db`. That's what `vi.mock` would do.

**Key takeaway:**
Service functions are integration-test territory. Unit tests cover pure functions. Know the boundary and own the decision.
