# H-02 — Database Hosting

## Slide 1 of 3 — Why Not a Local PostgreSQL

### The problem with running your own database on Vercel

Vercel is a **serverless** platform. When your API route runs, it runs inside a short-lived function. That function has:

- No persistent file system
- No long-running process
- No ability to manage a PostgreSQL server

This means the database must live somewhere else — a managed service — and your app connects to it over a network.

---

### What changes about the connection

On a traditional server, a single Prisma client holds a connection pool and reuses those connections for the lifetime of the process.

On Vercel:

```
Request arrives → cold start → function spawns → query runs → function exits
```

If each function spawn opens new database connections and the database sees thousands of requests per hour, you exhaust the database connection limit. For free-tier databases, this limit is low (typically 25–100).

This is why PrismApp uses the `@prisma/adapter-pg` driver adapter instead of the traditional Prisma query engine. More on that in slide H-03.

---

### The practical rule

> Your database must be reachable from the public internet with a TLS-encrypted connection string. Use a managed service.

---

## Slide 2 of 3 — Managed PostgreSQL Options

### Three options that work well with PrismApp

| Provider | Free tier | TLS | Connection pooling | Notes |
|----------|-----------|-----|-------------------|-------|
| **Neon** | 512 MB, 1 project | Yes, verify-full | Built-in (HTTP driver) | Best fit for Vercel; serverless-native |
| **Supabase** | 500 MB, 2 projects | Yes | Via PgBouncer (port 6543) | Full Postgres; includes Studio UI |
| **Railway** | $5/month credit | Yes | Not built-in | Easy setup; good for dev/staging |

For this course we use **Neon** as the worked example because:
1. It was designed for serverless from the ground up.
2. The connection string format works directly with `@prisma/adapter-pg`.
3. The free tier is sufficient for a society management app.

---

### What the connection string looks like

From Neon dashboard → Project → Connection Details → Prisma mode:

```
postgres://USER:PASSWORD@ep-cool-fog-12345.us-east-1.aws.neon.tech/DATABASE?sslmode=verify-full
```

The important parts:

| Part | What it is |
|------|-----------|
| `USER:PASSWORD` | Your database user credentials |
| `ep-cool-fog-12345.us-east-1.aws.neon.tech` | Neon's endpoint hostname |
| `/DATABASE` | The name of your database |
| `?sslmode=verify-full` | Require full TLS certificate verification |

Paste this string exactly into `DATABASE_URL` in your Vercel project's environment variables.

---

### A word about Supabase

If you use Supabase, use the **pooler connection string** (port 6543) for the app runtime. Use the **direct connection** (port 5432) only for migrations, because the pooler does not support all migration SQL.

This means setting two different `DATABASE_URL` values: one for migrations, one for the app. PrismApp does not currently distinguish these — something to know if you switch to Supabase.

---

## Slide 3 of 3 — Connection Pooling on Vercel

### Why the traditional Prisma client breaks on serverless

The standard Prisma client maintains an internal connection pool using a binary query engine process. That process is long-lived — it assumes your server is always running.

On Vercel, each serverless function invocation is independent. If 50 requests arrive simultaneously, 50 function instances could each try to open their own pool of connections. The database runs out of connections.

---

### What `@prisma/adapter-pg` does differently

PrismApp uses the Prisma driver adapter pattern:

```ts
// src/lib/db.ts (simplified)
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

The `pg` Pool object manages connections at the Node.js runtime level, not inside Prisma's binary engine. This is lighter and works correctly in the short-lived serverless environment.

---

### The `withVerifyFullSsl()` detail

In `src/lib/db.ts`, the actual code does:

```ts
const adapter = new PrismaPg(pool, { schema: undefined });
```

...and the pool is created with `ssl: neonConfig.webSocketConstructor ? undefined : { rejectUnauthorized: true }` or with a `withVerifyFullSsl()` utility that pins `sslmode=verify-full`.

This means the app **refuses to connect** if the server's TLS certificate is not trusted. It is not possible to silently downgrade to an unencrypted connection.

---

### The dev singleton pattern

```ts
// Also in src/lib/db.ts
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

In local development, Next.js reloads modules on every file change. Without this guard, each reload would create a new `PrismaClient` with a new connection pool, exhausting your local Postgres connections in minutes.

The `global.prisma ??` pattern ensures only one client is created across all hot-reloads in development. In production (Vercel), this pattern is a no-op — each function invocation gets a fresh module.

---

### Takeaway

> Use a managed PostgreSQL provider. Use the `@prisma/adapter-pg` adapter — it is already wired up. Use `sslmode=verify-full` in your `DATABASE_URL`. These three decisions together make Prisma work correctly on Vercel.
