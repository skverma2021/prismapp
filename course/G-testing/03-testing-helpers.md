# Slide Script — G-03: Testing Helpers

---

## Slide 1 — Anatomy of a Helper Test File

**Type:** `Code`

**Headline:**
> Every test file: one import block, then `describe` blocks that mirror the source file's exports.

**Visual / layout:**
Annotated code block showing:
1. Import block (`describe`, `it`, `expect` from vitest, then `HttpError`, then the functions under test)
2. First `describe` block for `roundTo2`
3. First `it` block — positive case
4. Second `it` block — edge case with IEEE 754 comment

**Narration:**
Open `contributions.helpers.test.ts`. The structure is consistent:

```ts
import { describe, it, expect } from "vitest";
import { HttpError } from "@/src/lib/api-response";
import {
  roundTo2,
  monthLabel,
  normalizeHeadPeriod,
  parseContributionId,
  // ...
} from "../contributions.helpers";
```

Three groups of imports:
1. Vitest's test functions — not from `@vitest/runner` or any other path, just `"vitest"`
2. `HttpError` — needed to assert that thrown errors are the right type
3. The functions under test — relative import from the source file

Then `describe` blocks, one per function. Inside each `describe`, `it` blocks name one specific behaviour:

```ts
describe("roundTo2", () => {
  it("leaves whole numbers unchanged", () => {
    expect(roundTo2(100)).toBe(100);
    expect(roundTo2(0)).toBe(0);
  });

  it("rounds to 2 decimal places", () => {
    expect(roundTo2(1.234)).toBe(1.23);
    expect(roundTo2(1.235)).toBe(1.24);
  });
});
```

The naming convention: `describe` holds the **function name**. `it` describes **one behaviour** in plain English. Together they read like a sentence: *"roundTo2 rounds to 2 decimal places"*.

**On-screen action / demo:**
Open `contributions.helpers.test.ts` in VS Code. Collapse all `describe` blocks. Show the outline: each block is one function from the source file.

**Key takeaway:**
One `describe` per function. One `it` per behaviour. Imports: vitest functions, HttpError, then the functions under test.

---

## Slide 2 — Testing Date Utilities: The `d()` Helper Pattern

**Type:** `Code`

**Headline:**
> Inline date helper `const d = (iso) => new Date(iso + "T00:00:00.000Z")` eliminates noisy `new Date(...)` calls in every test.

**Visual / layout:**
Before/after. Before: test with full `new Date("2026-01-31T00:00:00.000Z")` repeated 4 times. After: same test with `d("2026-01-31")` — cleaner, the dates are the focus.

**Narration:**
The overlap tests in `ownerships.helpers.test.ts` deal with date ranges. You need to create many `Date` objects. Two options:

**Without the helper:**
```ts
expect(
  rangesOverlap(
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-01-31T00:00:00.000Z"),
    new Date("2026-02-01T00:00:00.000Z"),
    null
  )
).toBe(false);
```

**With the helper:**
```ts
const d = (iso: string) => new Date(iso + "T00:00:00.000Z");

expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-02-01"), null)).toBe(false);
```

The helper is defined inside the `describe` block — it's local, not exported. It exists only to make the test cases readable. The `T00:00:00.000Z` suffix forces UTC midnight, which is the convention used throughout PrismApp for date-only values.

This is a common test pattern: create a small inline factory when constructing test inputs is verbose. Don't factor it out to a shared module unless multiple test files need it — keep it local.

**On-screen action / demo:**
Open `ownerships.helpers.test.ts`. Show the `const d = ...` line at the top of the `describe` block. Count how many times it's used. Then temporarily delete it and show how verbose the calls would be.

**Key takeaway:**
Local inline helpers in `describe` blocks are fine. They improve readability without creating shared-module overhead.

---

## Slide 3 — Testing Overlap Logic: The Important Edge Cases

**Type:** `Code`

**Headline:**
> Three boundary cases are where overlap logic goes wrong: adjacent ranges, same-day boundaries, and open-ended ranges.

**Visual / layout:**
Timeline diagram showing three boundary cases:
1. A ends Jan 31, B starts Feb 1 — adjacent, NOT overlapping
2. A ends Jan 31, B starts Jan 31 — same-day boundary, IS overlapping
3. A starts Jan 2026, no end — open-ended, B starting any time after Jan 2026 IS overlapping

**Narration:**
`rangesOverlap` has clear business rules:
- `toDt` is **inclusive** — if A's end date equals B's start date, they overlap (the same calendar day can't belong to two records)
- Adjacent ranges are allowed — A ends Jan 31, B starts Feb 1 is fine (one day gap)
- Open-ended ranges (`toDt = null`) extend to infinity

The tests cover all three boundary conditions:

```ts
// Adjacent: NOT overlapping
expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-02-01"), null)).toBe(false);

// Same-day boundary: IS overlapping
expect(rangesOverlap(d("2026-01-01"), d("2026-01-31"), d("2026-01-31"), d("2026-02-28"))).toBe(true);

// Open-ended: IS overlapping with anything that starts after A starts
expect(rangesOverlap(d("2026-01-01"), null, d("2026-06-01"), d("2026-08-31"))).toBe(true);
```

Why test these specifically? Because these are the cases where off-by-one bugs appear. If the implementation used `>` instead of `>=` for the same-day check, adjacent-allowed would silently become same-day-allowed-too. The test catches that.

**On-screen action / demo:**
Open `ownerships.helpers.test.ts`. Read the three boundary test cases with their comments. Then open `ownerships.helpers.ts` and find the `rangesOverlap` implementation — confirm the boundary condition used.

**Key takeaway:**
Test the boundaries, not just the happy path. Overlap logic fails at the edges: adjacent, same-day, and open-ended.
