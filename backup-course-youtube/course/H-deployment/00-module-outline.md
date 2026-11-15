# Module H — Deployment

## Overview

You built it. Now ship it.

This module walks through every step of getting PrismApp running in production on Vercel with a hosted PostgreSQL database. We cover the *why* behind each decision — not just the clicks — so you can reason about problems when they come up.

By the end of this module you will have:
- a hosted Neon (or Supabase) PostgreSQL database
- a live Vercel deployment connected to that database
- production migrations applied cleanly
- all environment variables set correctly for production and preview environments
- Sentry wired up and emitting errors

---

## Prerequisites

Before this module:
- Complete sections A through E (scope, ERD, technology, CRUD, hardening)
- Have a GitHub account and the PrismApp repo in your own GitHub account
- Have a Vercel account (free tier is fine)
- Have a Neon or Supabase account (free tier is fine)

---

## Slides

| Slide | File | Topic |
|-------|------|-------|
| H-01 | `01-environment-variables.md` | What environment variables are, the `.env.example` walkthrough |
| H-02 | `02-database-hosting.md` | Why hosted PostgreSQL, options, connection pooling on Vercel |
| H-03 | `03-prisma-in-production.md` | `migrate deploy` vs `migrate dev`, the build pipeline |
| H-04 | `04-vercel-deployment.md` | Connecting GitHub, Vercel dashboard, preview deployments |
| H-05 | `05-security-and-configuration.md` | Security headers, Sentry source maps, first-run checklist |
| H-06 | `06-deployment-exercise.md` | Hands-on: deploy to Neon + Vercel end-to-end |

---

## Key Files in the Codebase

| File | Why It Matters |
|------|---------------|
| `.env.example` | Template for all environment variables — the canonical list |
| `vercel.json` | Custom build command: `prisma generate && next build` |
| `package.json` `postinstall` | Runs `prisma generate` during Vercel's install phase |
| `prisma/schema.prisma` | Schema consumed by `migrate deploy` in production |
| `src/lib/db.ts` | PrismaPg adapter with `withVerifyFullSsl()` — why connections work on serverless |
| `next.config.ts` | Security response headers applied to every route |
| `sentry.server.config.ts` | Sentry tracing and error capture initialisation |

---

## Module Learning Objectives

After completing this module you will be able to:

1. Explain why environment variables exist and how Next.js separates server-only secrets from public config.
2. Choose a managed PostgreSQL provider and construct a valid `DATABASE_URL`.
3. Explain why PrismaPg (the `@prisma/adapter-pg` driver adapter) is needed on Vercel serverless functions.
4. Distinguish `prisma migrate dev` from `prisma migrate deploy` and know which to run where.
5. Deploy PrismApp to Vercel by connecting a GitHub repo, setting all required env vars, and triggering the first build.
6. Handle the `NEXTAUTH_URL` problem on Vercel preview deployments.
7. Verify Sentry is capturing errors in production.
8. Complete a post-deployment smoke test to confirm the app is working end-to-end.

---

## Definition of Done

- `vercel build` passes with no errors.
- The live production URL opens the login page.
- Login with seeded credentials works.
- Contribution capture creates a record visible in the paid/unpaid report.
- Sentry dashboard shows at least one trace.
- No secrets are committed to the repository.
