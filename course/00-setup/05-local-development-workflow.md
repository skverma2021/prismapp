# Slide Script — 00-05: Local Development Workflow

---

## Slide 1 — Starting the Development Server

**Type:** `Code`

**Headline:**
> `npm run dev` starts the app. Every file save triggers a hot reload.

**Visual / layout:**
Terminal showing `npm run dev` output: Turbopack compiling message, "Ready in X ms", route list. Browser screenshot beside it showing the login page at localhost:3000.

**Narration:**
Start the development server:

```bash
npm run dev
```

You will see output from Turbopack (Next.js's development bundler):

```
   ▲ Next.js 16.2.6 (Turbopack)
   - Local:        http://localhost:3000
   - Environments: .env

 ✓ Ready in 1847ms
```

Open `http://localhost:3000` in your browser. You should see the login page.

Hot reload is active. When you save a file in VS Code, the browser updates automatically — usually within a second. Server-side changes (route handlers, server components) also reload without a full page refresh.

Leave this terminal running throughout your development session. Do not close it.

**On-screen action / demo:**
Run `npm run dev`. Wait for "Ready". Open localhost:3000. Show the login page loading.

**Key takeaway:**
`npm run dev` is the command you run at the start of every development session. Leave it running.

---

## Slide 2 — Lint, Build, and Test

**Type:** `Code`

**Headline:**
> Three commands tell you if the code is correct before you commit.

**Visual / layout:**
Three terminal blocks side by side: `npm run lint`, `npm run build`, `npm run test`. Each with a brief description of what it checks.

**Narration:**
The three quality-gate commands you will use throughout the course:

---

**`npm run lint`**

Runs ESLint over the entire codebase:

```bash
npm run lint
```

ESLint checks for code quality issues: unused imports, `any` types where not expected, accessibility issues in JSX, and Next.js-specific rules. A clean run produces no output. Errors are shown with file and line numbers.

Run this before every commit.

---

**`npm run build`**

Runs the production build:

```bash
npm run build
```

This compiles TypeScript, optimises assets, and generates the `.next` output directory. It is slower than `lint` but catches a different class of error — particularly type errors that only surface during full compilation.

Run this when making changes to the schema, module structure, or server actions to confirm nothing is broken.

---

**`npm run test`**

Runs the test suite with Vitest:

```bash
npm run test
```

Tests live in `src/modules/*/` alongside the code they test. The test command runs all of them once and exits. Use `npm run test:watch` during active development to re-run tests on every file save.

**On-screen action / demo:**
Run each command in sequence. Show the clean output. Emphasise that a passing lint + build + test before committing catches most problems before they reach the repository.

**Key takeaway:**
Lint → Build → Test. This sequence is the quality gate before every commit.

---

## Slide 3 — Additional Development Commands

**Type:** `Concept`

**Headline:**
> A few more commands you will reach for regularly.

**Visual / layout:**
Reference table. Two columns: command, what it does. Six rows.

**Narration:**
Beyond the core four (`dev`, `lint`, `build`, `test`), these commands come up regularly during development:

| Command | What it does |
|---------|-------------|
| `npm run prisma:migrate:dev` | Applies new migrations in development; regenerates Prisma Client |
| `npm run prisma:seed` | Inserts initial seed data into the database |
| `npx prisma studio` | Opens the database browser at port 5555 |
| `npx prisma db push` | Syncs schema to database without creating a migration file — fast iteration but no history |
| `npm run test:watch` | Re-runs tests on every file save |
| `npm run test:coverage` | Runs tests and generates a coverage report |

One important distinction:

- `prisma migrate dev` — creates a migration file in `prisma/migrations/` and applies it. This is the correct path for changes you want tracked and deployable.
- `prisma db push` — applies the schema directly without creating a migration file. Useful for quick experiments. Do not use it for any change you intend to deploy.

**On-screen action / demo:**
No action needed — this is a reference slide. Suggest bookmarking this page.

**Key takeaway:**
`prisma migrate dev` for tracked changes. `prisma db push` for throwaway experiments. Never use `prisma migrate dev` against a production database.
