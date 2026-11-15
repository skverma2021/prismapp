# Project Structure Walkthrough

**Audience:** Developers new to PrismApp or to Next.js App Router projects.  
**Purpose:** Explain what every folder contains and why it is organised this way.  
**Read after:** `react-express-transition.md` — you need the mental model shift before this tour makes sense.

---

## The top-level view

```
prismapp/
│
├── app/                  ← Next.js App Router root
├── src/                  ← Application logic (not Next.js-specific)
├── prisma/               ← Database schema, migrations, seed
├── vault/                ← Authoritative specifications and domain rules
├── course/               ← Teaching materials (not shipped to production)
├── public/               ← Static files served at /
├── scripts/              ← Standalone Node.js scripts (DB backup, tests)
│
├── auth.ts               ← next-auth configuration
├── next.config.ts        ← Next.js build and runtime configuration
├── prisma.config.ts      ← Prisma CLI configuration (adapter, migration dir)
├── vitest.config.ts      ← Vitest unit test configuration
└── tsconfig.json         ← TypeScript configuration
```

---

## `app/` — the Next.js routing layer

```
app/
├── (dashboard)/          ← Route group: all authenticated pages
│   ├── layout.tsx        ← Dashboard shell: nav sidebar + header
│   ├── error.tsx         ← Error boundary for the entire dashboard
│   ├── loading.tsx       ← Suspense fallback for the dashboard layout
│   ├── blocks/           ← One folder per module
│   │   └── page.tsx      ← The browse/manage page for Blocks
│   ├── units/
│   │   └── page.tsx
│   ├── individuals/
│   ├── contributions/
│   └── ...               ← One folder for each domain module
│
├── (public)/             ← Route group: unauthenticated pages
│   └── page.tsx          ← The login page (at /)
│
├── api/                  ← Route handlers (the API layer)
│   ├── blocks/
│   │   ├── route.ts      ← GET /api/blocks, POST /api/blocks
│   │   └── [id]/
│   │       └── route.ts  ← GET, PATCH, DELETE /api/blocks/:id
│   ├── units/
│   ├── contributions/
│   └── ...               ← Mirrors the domain module structure
│
├── reports/              ← Report pages (outside dashboard group)
├── contributions/        ← Contribution entry pages (outside dashboard group)
│
├── layout.tsx            ← Root layout: <html>, <body>, Providers
├── globals.css           ← Global styles (Tailwind base)
└── not-found.tsx         ← 404 page
```

**Route groups** (`(dashboard)`, `(public)`) are folders whose names do not appear in the URL. They let you apply a shared layout to a set of routes without adding a path segment.

**Why `api/` is inside `app/`**: Route handlers in the App Router live alongside pages. There is no separate `pages/api/` folder (that is the Pages Router pattern). `app/api/` just happens to be the conventional location — Next.js doesn't require that name.

---

## `src/` — application logic

```
src/
├── modules/              ← One subfolder per domain entity
│   ├── blocks/
│   │   ├── blocks.schemas.ts   ← Input parse/validate functions
│   │   └── blocks.service.ts   ← Business logic + all Prisma calls
│   ├── units/
│   ├── contributions/
│   │   ├── contributions.schemas.ts
│   │   ├── contributions.service.ts
│   │   ├── contributions.helpers.ts   ← Pure functions (unit-testable)
│   │   └── __tests__/
│   │       ├── contributions.schemas.test.ts
│   │       └── contributions.helpers.test.ts
│   └── reports/
│       └── contributions-reports.service.ts
│
├── components/           ← Shared React components
│   ├── master-data/      ← Reusable table, filter, pagination, form components
│   ├── shell/            ← Nav, header, session notices
│   ├── auth/             ← Login form, sign-in page components
│   └── ui/               ← Low-level primitives (button, input, badge)
│
├── hooks/                ← Custom React hooks used across module pages
│   ├── use-browse-state.ts    ← Draft/applied filter state + pagination
│   └── use-crud-actions.ts    ← Create/update/delete operation state
│
├── lib/                  ← Shared utilities and infrastructure
│   ├── db.ts             ← Prisma client singleton
│   ├── api-response.ts   ← ok(), fail(), HttpError, fromUnknownError
│   ├── authz.ts          ← requireReadRole(), requireMutationRole()
│   ├── auth-session.tsx  ← useAuthSession() hook + SessionProvider
│   ├── audit-log.ts      ← writeAuditLog()
│   └── ...
│
└── types/                ← Shared TypeScript types (not domain-specific)
```

**Why `src/modules/` instead of a flat `services/` folder?**  
Each module is a self-contained vertical slice. `blocks.schemas.ts` and `blocks.service.ts` always travel together. When you add a new entity, you add one new folder to `src/modules/` — you never edit someone else's module.

**Why separate `schemas.ts` from `service.ts`?**  
Schemas are tested without a database. Services need Prisma. Keeping them in separate files means the schema tests import only the schema file — no accidental Prisma import and no need to mock the DB.

---

## `prisma/` — the data layer

```
prisma/
├── schema.prisma         ← All model definitions, relations, indexes
├── seed.mjs              ← Initial data: blocks, genders, heads, periods
├── migrations/           ← One subfolder per migration (timestamp-named)
│   ├── 20260319114421_prismaapp/
│   │   └── migration.sql
│   └── ...
└── migration-drafts/     ← SQL for planned changes not yet migrated
```

`schema.prisma` is the canonical description of the database. Migrations are generated from schema diffs. **Never edit a migration file after it has been applied to any environment** — generate a new migration instead.

---

## `vault/` — the specification layer

```
vault/
├── 00-Core/              ← System overview, roles, ADRs, glossary
├── 01-Domain/            ← Domain rules, ERD, entity definitions
├── 03-API/               ← API contracts, error model, pagination spec
├── 04-Reports/           ← Report definitions, column specs
└── CMM/                  ← Complaint Management Module vision
```

The vault is the source of truth for **what the system should do**. When the vault and the code disagree, the vault wins (unless the vault is updated with an ADR). See `how-to-read-the-vault.md` for how to navigate it.

---

## Key files at the root

| File | Purpose |
|------|---------|
| `auth.ts` | Configures next-auth: credentials provider, JWT callbacks, session shape |
| `next.config.ts` | Next.js config: security headers, Sentry, redirect rules |
| `prisma.config.ts` | Tells Prisma CLI to use `@prisma/adapter-pg` and where migrations live |
| `vitest.config.ts` | Test runner config: `node` environment, `__tests__` include pattern, `@` alias |
| `vercel.json` | Vercel-specific config: `postinstall` hook to run `prisma migrate deploy` on every deploy |
| `proxy.ts` | Local development auth proxy (workaround for `localhost` / `AUTH_TRUST_HOST`) |

---

## What is NOT in this project

- No `pages/` folder — this is the App Router, not the Pages Router.
- No `components/` at the root — components live under `src/components/`.
- No `utils/` folder — utilities are in `src/lib/` (infrastructure) or `src/modules/*/helpers.ts` (domain-specific).
- No Redux or Zustand — client state lives in React's `useState` and custom hooks.
- No ORM other than Prisma — raw SQL exists only in migrations.
