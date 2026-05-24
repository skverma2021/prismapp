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

**Unit tests** sit at the bottom — they're fast, cheap, and completely isolated. No database, no HTTP, no filesystem. You pass a value in and check a value out.

**Integration tests** test a combination of components — often a service function plus a real database, or a route handler plus a simulated HTTP request. They're slower and require more setup.

**E2E tests** drive a real browser through real user flows. They catch the most real-world bugs but are the slowest and most brittle.

PrismApp has five unit test files covering pure functions and input parsers. There are no integration or E2E tests — not because they're unimportant, but because the highest-risk code (financial calculations, overlap detection, input validation) lives in pure functions that don't need a database to test.

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
Not every function needs a test. A function that passes a value through or calls one other function doesn't have much logic to verify.

A function is worth testing when:

**It has multiple valid behaviours** — `normalizeHeadPeriod` accepts `"MONTH"`, `"month"`, `"Month"`, and `"  MONTH  "` (with whitespace). All must return `"MONTH"`. A change that breaks case-insensitive handling would otherwise silently affect UI dropdowns and database values.

**It has known error cases that must fire** — `parseContributionId` must throw on `"0"`, `"-5"`, `"abc"`, and empty string. If any of these are silently accepted, invalid IDs reach the database query.

**Downstream code trusts its output** — `roundTo2` is called in the payment write path and the expected-amount calculation. If it returns the wrong value, amounts are wrong in both payment records and reports. A test confirms it behaves correctly for edge cases like `1.005` (which rounds differently due to IEEE 754 representation).

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
Look at any service function — `createContribution`, `getContributionTransactionsReport`. They call `db.something.findMany(...)`. You can't run that in a unit test without either a real database or a mock of Prisma.

A Prisma mock is possible (`vi.mock`), but it means you're testing that your code calls the mock correctly — not that the combination of your query and the database produces the right result. For that you need an integration test against a real (test) database.

Route handlers have a similar problem: they need a `NextRequest` object and some way to simulate the Next.js runtime.

UI component tests need JSDOM (a browser simulation in Node) and are fragile when components change.

**None of this means you shouldn't have these tests.** It means they're a different category with higher setup cost. For V1, PrismApp tests the code that's cheapest to test and highest-risk if wrong — pure logic functions.

When you're ready to add integration tests, you'd spin up a test database (a separate schema or container), run migrations against it, and run service tests in that environment.

**On-screen action / demo:**
Open `src/modules/contributions/contributions.service.ts`. Show the Prisma calls. Then show `db.ts` — the singleton. Point out: to unit test this, you'd need to replace `db`. That's what `vi.mock` would do.

**Key takeaway:**
Service functions are integration-test territory. Unit tests cover pure functions. Know the boundary and own the decision.
