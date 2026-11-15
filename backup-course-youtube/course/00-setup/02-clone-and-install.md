# Slide Script — 00-02: Clone and Install

---

## Slide 1 — Cloning the Repository

**Type:** `Code`

**Headline:**
> One command gets the code. One command gets the dependencies.

**Visual / layout:**
Terminal window showing three commands: `git clone`, `cd prismapp`, `npm install`. Output lines beneath each. Clean, step-focused.

**Narration:**
With your tools installed, clone the repository:

```bash
git clone https://github.com/YOUR_ACCOUNT/prismapp.git
cd prismapp
```

If you are using a fork (recommended for the exercises), replace `YOUR_ACCOUNT` with your GitHub username. If you are using the original repository as read-only, use the course instructor's URL.

Once inside the folder, install dependencies:

```bash
npm install
```

This downloads all packages listed in `package.json`. The first run takes a minute or two depending on your internet speed.

**On-screen action / demo:**
Run these three commands in the terminal. Show the progress output of `npm install`.

**Key takeaway:**
Clone, change directory, install. Three commands.

---

## Slide 2 — What `npm install` Does (and the `postinstall` Hook)

**Type:** `Concept`

**Headline:**
> `npm install` does one extra thing that matters for this project.

**Visual / layout:**
Flow diagram: `npm install` → downloads packages → triggers `postinstall` → runs `prisma generate` → writes generated client to `node_modules/@prisma/client`.

**Narration:**
After all packages are downloaded, npm automatically runs the `postinstall` script defined in `package.json`:

```json
"postinstall": "prisma generate"
```

`prisma generate` reads your `prisma/schema.prisma` file and writes TypeScript types and a database client into `node_modules/@prisma/client`. This generated code is what lets you write:

```ts
import { db } from "@/lib/db";
const blocks = await db.block.findMany();
```

If `prisma generate` has not run, those import paths do not exist and TypeScript will report hundreds of errors. The `postinstall` hook ensures generate runs automatically — you do not need to remember to run it manually.

**On-screen action / demo:**
After `npm install` finishes, show `node_modules/@prisma/client` in the file tree. Show one of the generated type files briefly.

**Key takeaway:**
`npm install` also runs `prisma generate`. You will see this pattern again in the Vercel build.

---

## Slide 3 — Repository Structure Tour

**Type:** `Concept`

**Headline:**
> Knowing where things live saves you 10 minutes every time you need to find something.

**Visual / layout:**
Annotated directory tree. Key folders highlighted with a brief label next to each.

**Narration:**
Before going further, orient yourself in the repository:

```
prismapp/
├── app/                    # Next.js App Router — all pages and API routes
│   ├── (dashboard)/        # Authenticated pages (blocks, units, etc.)
│   ├── (public)/           # Login page — no auth required
│   └── api/                # Route Handlers (REST endpoints)
├── src/
│   ├── modules/            # Domain services — business logic lives here
│   ├── lib/                # Shared utilities (db, auth, error handling)
│   ├── components/         # Reusable UI components
│   └── types/              # TypeScript type definitions
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── migrations/         # SQL migration history
│   └── seed.mjs            # Seed script for initial data
├── vault/                  # Domain documentation (not code)
├── course/                 # This course — you are here
├── .env.example            # Environment variable template
└── package.json            # Scripts and dependencies
```

The `vault/` folder contains the domain rules, ERD, API specifications, and reporting specs that drive the implementation. Sections A and B of the course explain how to read these documents.

The `course/` folder is the course itself — slides, scripts, and notes. It is not part of the running application.

**On-screen action / demo:**
Open VS Code with `code .` from the project root. Show the Explorer panel. Click into `app/`, `src/modules/`, and `prisma/` briefly.

**Key takeaway:**
Business logic is in `src/modules/`. Pages are in `app/(dashboard)/`. The schema is `prisma/schema.prisma`. Everything else follows from these three anchor points.
