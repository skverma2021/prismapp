# Hands-On Exercise — G-06: Testing

---

## Before You Begin

Make sure the project installs and tests pass as-is.

```bash
npm run test
```

You should see all existing tests pass. If any fail before you start, resolve them first.

---

## Part 1 — Read and Understand (10 minutes)

### Step 1: Run Tests and Read the Output

Run `npm run test`. Note:
- How many test files are found?
- How many tests total?
- How long did it take?

### Step 2: Run in Watch Mode

Run `npm run test:watch`. Without touching any file, the tests should pass and Vitest should wait.

Open `src/modules/contributions/__tests__/contributions.helpers.test.ts`. Add a comment anywhere and save. Confirm that Vitest re-runs only the affected file.

Press `q` to quit watch mode when done.

### Step 3: Read the Config

Open `vitest.config.ts`. Answer these questions (write answers in a comment or note):

1. What is the `environment`? What does that mean for `window` and `document`?
2. What pattern does `include` use to find test files? Name one file that would NOT be found by this pattern.
3. What does the `@` alias resolve to?

---

## Part 2 — Extend an Existing Test File (15 minutes)

### Step 4: Add a Missing Edge Case to `roundTo2`

Open `src/modules/contributions/__tests__/contributions.helpers.test.ts`.

Find the `describe("roundTo2", ...)` block. Add a new `it` block that tests:

> `roundTo2` handles `NaN` input gracefully.

Run the test. Does `roundTo2` throw, return `NaN`, or return `0` for `NaN` input? Write the test to assert whatever the actual behaviour is.

**Tip:** Run `roundTo2(NaN)` in a Node REPL (`node -e "console.log(Math.round(NaN * 100) / 100)"`) to see the actual result first.

### Step 5: Add an Edge Case for `parseOptionalPositiveInt`

The helpers file exports `parseOptionalPositiveInt`. Find its tests in the file.

Add an `it` block that tests:
> Returns `undefined` when the input is `null`.

And another:
> Throws `HttpError` when the input is a float string like `"3.5"`.

Run `npm run test` to confirm both pass.

---

## Part 3 — Write a New Test File (20 minutes)

The report service exports `parseTransactionsReportParams` and `parseMatrixReportParams` (in `contributions-reports.service.ts`). These param parsers have clear validation rules.

Your task: write a new test file for these parsers.

### Step 6: Create the File

Create:
```
src/modules/reports/__tests__/contributions-reports.params.test.ts
```

### Step 7: Import What You Need

```ts
import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  parseTransactionsReportParams,
  parseMatrixReportParams,
} from "../contributions-reports.service";
```

### Step 8: Write Tests for `parseTransactionsReportParams`

Write at least 5 tests. Cover:

1. **Valid minimal input** — only `refYear` provided. Assert the result has the expected `page`, `pageSize`, `sortBy`, `sortDir` defaults.

   Hint: build a `URLSearchParams` like this:
   ```ts
   const sp = new URLSearchParams({ refYear: "2024" });
   const result = parseTransactionsReportParams(sp);
   ```

2. **Missing `refYear`** — empty `URLSearchParams`. Should throw `HttpError`.

3. **Invalid `refYear` (string)** — `refYear=abc`. Should throw `HttpError`.

4. **Invalid `sortBy`** — `sortBy=invalidField`. Should throw `HttpError`.

5. **Date range inverted** — `transactionDateFrom` is after `transactionDateTo`. Should throw `HttpError`.

### Step 9: Write Tests for `parseMatrixReportParams`

Write at least 3 tests:

1. **Valid input** — `refYear` and `headId` provided. Assert result shape.
2. **Missing `headId`** — only `refYear`. Should throw `HttpError`.
3. **Missing `refYear`** — only `headId`. Should throw `HttpError`.

### Step 10: Run Your Tests

```bash
npm run test
```

All existing tests should still pass. Your new tests should also pass.

Fix any test failures. If your understanding of the function's behaviour was wrong, update the test to match the actual behaviour — then understand why it behaves that way.

---

## Part 4 — Coverage Check (5 minutes)

### Step 11: Generate Coverage

```bash
npx vitest run --coverage
```

Open `coverage/index.html` in a browser (or read the terminal output).

Find `contributions-reports.service.ts` in the coverage report. What percentage of lines are covered? The param parser functions you tested should now show as covered.

---

## Part 5 — Reflection Questions

1. What is the difference between `toThrow(HttpError)` and `toThrow("some message string")`? Which is more stable?
2. Why does the test file define `const d = (iso: string) => new Date(iso + "T00:00:00.000Z")` inside the `describe` block instead of at the top of the file?
3. What would break if you removed `beforeEach(() => vi.clearAllMocks())` from a service test that uses mocks?
4. The `parseTransactionsReportParams` function validates `pageSize` to a maximum of 100. But `getContributionTransactionsCsv` passes `pageSize: Number.MAX_SAFE_INTEGER` directly. Does your test cover this? Should it?
5. Name one scenario in the PrismApp contribution module where a unit test would NOT be sufficient — only an integration test would give confidence. Why?

---

## Definition of Done

- [ ] All existing tests pass before and after your changes (`npm run test` = 0 failures)
- [ ] New `contributions-reports.params.test.ts` file created with at least 8 tests
- [ ] At least 5 tests cover `parseTransactionsReportParams`; at least 3 cover `parseMatrixReportParams`
- [ ] Coverage report generated and `parseTransactionsReportParams` / `parseMatrixReportParams` lines are shown as covered
- [ ] Reflection questions 1–3 answered
