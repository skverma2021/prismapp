# Slide Script — G-02: Vitest Setup

---

## Slide 1 — The Config File

**Type:** `Code`

**Headline:**
> `vitest.config.ts` is 20 lines. Every line controls something meaningful.

**Visual / layout:**
Full config file with annotations pointing to each field: `environment`, `include`, `coverage.provider`, `coverage.include`, `coverage.reporter`, `resolve.alias`.

**Narration:**
Open `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/modules/**/*.ts", "src/lib/**/*.ts"],
      exclude: ["src/modules/**/__tests__/**"],
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

**`environment: "node"`** means tests run in a pure Node.js environment. There is no `window`, no `document`, and no DOM APIs.

This is correct for server-side logic tests. To test React components, you would use `"jsdom"`.

**`include: ["src/**/__tests__/**/*.test.ts"]`** picks only files inside a `__tests__` folder. They must end in `.test.ts` and live inside `src/`. Files outside `src/` are not picked up. Files named `.spec.ts` are not picked up. This scoping is intentional.

**`coverage.provider: "v8"`** uses the V8 coverage engine built into Node. It is faster than Istanbul's `@vitest/coverage-istanbul`. It also needs zero extra dependencies.

**`coverage.include`** limits coverage to `src/modules/**` and `src/lib/**`. Route handlers in `app/api/` are excluded.

**`resolve.alias`** maps `@` to the project root. This is why test files can use `import { HttpError } from "@/src/lib/api-response"`. It is the same `@` alias used throughout the main codebase.

**On-screen action / demo:**
Open `vitest.config.ts`. Read each field. Show that `@` is the project root — type `"@"` in the import and trace it to `path.resolve(__dirname, ".")`.

**Key takeaway:**
The config is minimal and intentional. `environment: "node"`. Tests only in `__tests__` folders. Coverage only for `src/modules` and `src/lib`.

---

## Slide 2 — Where Tests Live

**Type:** `Concept`

**Headline:**
> Tests live in `__tests__/` subdirectories inside the module folder they test.

**Visual / layout:**
Directory tree showing:
```
src/
  modules/
    contributions/
      contributions.helpers.ts
      contributions.schemas.ts
      contributions.service.ts
      __tests__/
        contributions.helpers.test.ts   ← tests for helpers
        contributions.schemas.test.ts   ← tests for schemas
    ownerships/
      ownerships.helpers.ts
      __tests__/
        ownerships.helpers.test.ts
```

**Narration:**
Each module that has tests follows the same layout. The test file lives in a `__tests__` folder inside the module directory. The test file name mirrors the source file name with `.test.ts` appended.

This co-location pattern has four benefits.

You know where tests are without searching.

When you open `contributions.helpers.ts`, you know to look in `__tests__/contributions.helpers.test.ts`.

When you delete a source file, you can easily find and delete its tests.

The `include` glob in `vitest.config.ts` picks up this pattern automatically.

There is no central `tests/` folder at the root. Tests are owned by their modules.

**On-screen action / demo:**
Open VS Code's Explorer. Navigate to `src/modules/contributions/`. Expand `__tests__/`. Show the two files. Then show `src/modules/ownerships/__tests__/`. Same pattern.

**Key takeaway:**
Tests live in `__tests__/` inside their module folder. Co-location over central test directory.

---

## Slide 3 — Running Tests

**Type:** `Concept`

**Headline:**
> Three commands cover development, CI, and coverage. Learn all three.

**Visual / layout:**
Three command blocks with labels. `npm run test` (single pass). `npm run test:watch` (watch mode). `npx vitest run --coverage` (coverage report).

**Narration:**
`package.json` defines:

```json
"test": "vitest run",
"test:watch": "vitest"
```

**`npm run test`** runs all tests once and exits. Exit code 0 means all tests passed. Exit code 1 means at least one test failed. A CI pipeline runs this command.

**`npm run test:watch`** starts Vitest in watch mode. Vitest watches for file changes and re-runs the affected tests automatically. You use this during development. When you edit a helper, only that helper's tests re-run. The entire suite does not run.

**`npx vitest run --coverage`** runs all tests and generates a coverage report. The text output appears in the terminal. The HTML report goes to the `coverage/` folder. Open `coverage/index.html` in a browser to see which lines were reached.

Here is the output you need to know.

Green dots are passing tests.

A red `✗` is a failing test.

A `FAIL` prefix means that test file has a failure.

The summary line reads `X tests passed, Y skipped, Z failed` in N.NNs.

**On-screen action / demo:**
Run `npm run test` in the terminal. Walk through the output. Point to the count and duration. Then run `npm run test:watch` and edit a test file — show the re-run trigger.

**Key takeaway:**
`npm run test` for CI. `npm run test:watch` for development. `--coverage` when you want to see what's covered.
