# Slide Script — 00-05: Local Development Workflow

---

## Slide 1 — Starting the Development Server

**Type:** `Code`

**Headline:**
> `npm run dev` starts the app. Every file save triggers a hot reload.

**Visual / layout:**
Terminal showing `npm run dev` output: Turbopack compiling message, "Ready in X ms", route list. Browser screenshot beside it showing the login page at localhost:3000.

**Narration:**
Start the development server with this command.

```bash
npm run dev
```

You will see output from Turbopack. Turbopack is the development bundler of Next.js.

```
   ▲ Next.js 16.2.6 (Turbopack)
   - Local:        http://localhost:3000
   - Environments: .env

 ✓ Ready in 1847ms
```

Open `http://localhost:3000` in your browser. You should see the login page.

Hot reload is active. When you save a file in VS Code, the browser updates automatically. This usually takes about a second.

Server-side changes also reload without a full page refresh. These include route handlers and server components.

Leave this terminal running during your whole development session. Do not close it.

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
Here are the three quality-gate commands you will use throughout the course.

---

**`npm run lint`**

This runs ESLint over the entire codebase.

```bash
npm run lint
```

ESLint checks for code quality issues. These include unused imports and `any` types where they are not expected. They also include accessibility issues in JSX and Next.js-specific rules.

A clean run produces no output. Errors are shown with file and line numbers.

Run this before every commit.

---

**`npm run build`**

This runs the production build.

```bash
npm run build
```

It compiles TypeScript, optimises assets, and generates the `.next` output directory.

It is slower than `lint`. But it catches a different kind of error. In particular, it finds type errors that only appear during full compilation.

Run this when you change the schema, the module structure, or server actions. It confirms that nothing is broken.

---

**`npm run test`**

This runs the test suite with Vitest.

```bash
npm run test
```

Tests live in `src/modules/*/`, next to the code they test. The test command runs all of them once and exits.

During active development, use `npm run test:watch`. It re-runs tests on every file save.

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
Beyond the core four, `dev`, `lint`, `build`, and `test`, there are a few more commands.

You will use them regularly during development.

| Command | What it does |
|---------|-------------|
| `npm run prisma:migrate:dev` | Applies new migrations in development; regenerates Prisma Client |
| `npm run prisma:seed` | Inserts initial seed data into the database |
| `npx prisma studio` | Opens the database browser at port 5555 |
| `npx prisma db push` | Syncs schema to database without creating a migration file — fast iteration but no history |
| `npm run test:watch` | Re-runs tests on every file save |
| `npm run test:coverage` | Runs tests and generates a coverage report |

One important distinction.

- `prisma migrate dev` creates a migration file in `prisma/migrations/` and applies it. This is the correct path for changes you want tracked and deployable.
- `prisma db push` applies the schema directly without creating a migration file. It is useful for quick experiments. Do not use it for any change you plan to deploy.

**On-screen action / demo:**
No action needed — this is a reference slide. Suggest bookmarking this page.

**Key takeaway:**
`prisma migrate dev` for tracked changes. `prisma db push` for throwaway experiments. Never use `prisma migrate dev` against a production database.
