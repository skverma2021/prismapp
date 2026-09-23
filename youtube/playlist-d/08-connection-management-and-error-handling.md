# Playlist D · Episode 8 — "Connection Management and Database Error Handling"

## Video Metadata

- **Playlist:** D — PostgreSQL & Prisma Through the Real Application (app-agnostic;
  episodes accumulate across every case-study application on the channel)
- **Case-study app:** PrismApp
- **Sub-arc:** From Schema to Running Database (2 of 2)
- **Target length:** 6–8 minutes
- **Primary goal:** Show how this app avoids exhausting database connections in a
  serverless environment, enforces a secure Postgres connection, and classifies
  database failures instead of treating every error the same.
- **Title options:**
  1. Connection Management and Database Error Handling
  2. One Client, Many Requests
  3. What Happens When the Database Is Actually Down
- **Thumbnail concept:** A single Prisma Client icon at the center, with dozens of
  faint serverless-function icons around it, all arrows pointing inward to the one
  client.
- **Teaching principle:** Database requirement → relational model → PostgreSQL →
  Prisma.

---

## Cold Open (0:00–0:25)

**Visual:** Talking head.

**Narration:**
> "Serverless functions can spin up many instances of your app at once — and every
> instance that carelessly creates its own Prisma Client opens its own pool of
> database connections. Multiply that by traffic, and you can exhaust Postgres's
> connection limit before you've written a single line of business logic. This
> episode is about the one file that prevents that, and what happens when the
> database still isn't reachable anyway."

---

## Scene 1 — A singleton, cached across the process (0:25–2:00)

**Visual:** Open `src/lib/db.ts`, the global caching pattern, full file.

**Code shown:**
```ts
declare global {
  var prisma: PrismaClient | undefined;
}

// ...

export const db =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
```

**Narration:**
> "`db` is created once and reused everywhere else in the app via `import { db }
> from "@/src/lib/db"`. In development, where hot-reloading would otherwise create
> a fresh `PrismaClient` — and a fresh connection pool — on every file save, it's
> cached on `global.prisma` so the same instance survives the reload. In
> production, each serverless instance still gets its own client, but at least it's
> exactly one per instance, not one per request within that instance."

---

## Scene 2 — A Postgres-specific adapter, and enforced TLS (2:00–3:15)

**Visual:** Highlight `PrismaPg` and `withVerifyFullSsl` in the same file.

**Code shown:**
```ts
function withVerifyFullSsl(url: string): string {
  const u = new URL(url);
  const mode = u.searchParams.get("sslmode");
  if (mode && mode !== "disable" && mode !== "verify-full") {
    u.searchParams.set("sslmode", "verify-full");
  }
  return u.toString();
}

const connectionString = withVerifyFullSsl(rawConnectionString);
const adapter = new PrismaPg({ connectionString });
```

**Narration:**
> "`PrismaPg` is Prisma's driver adapter for Postgres specifically — it's what
> lets this app talk to Postgres through the `pg` driver directly, rather than
> Prisma's own built-in engine. And before that connection string is used, this
> function rewrites its `sslmode` — if the environment's connection string says
> anything weaker than `verify-full`, it's upgraded. That's a deliberate,
> code-enforced floor on transport security: whatever gets pasted into
> `DATABASE_URL`, the actual connection to Postgres won't downgrade below
> certificate-verified TLS."

---

## Scene 3 — The one deliberate raw SQL statement in the app (3:15–4:15)

**Visual:** Open `app/api/health/route.ts`, lines 1–26.

**Code shown:**
```ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok" }, { status: 200 });
  } catch (err) {
    // ...
  }
}
```

**Narration:**
> "Remember Episode 6's claim that this app has essentially no raw SQL? Here's the
> one exception — a health-check endpoint, used by Vercel and uptime monitors, that
> does nothing but confirm the database is reachable and can complete a
> round-trip. `SELECT 1` isn't a domain query; it's the smallest possible proof of
> life. This is exactly the kind of narrow, justified case where reaching past the
> typed query API makes sense — the alternative, some `findFirst` against a real
> table, would work but would be answering a slightly different question."

---

## Scene 4 — Not every database error means the same thing (4:15–5:45)

**Visual:** Open `src/lib/api-response.ts`, `isConnectivityFailure` and
`isRetryableDatabaseFailure`.

**Code shown:**
```ts
function isConnectivityFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toUpperCase();
  return (
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("CAN'T REACH DATABASE SERVER")
  );
}

function isRetryableDatabaseFailure(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    const prismaLikeError = error as { code?: string };
    if (["P1001", "P1002", "P1017", "P2024", "P2028"].includes(prismaLikeError.code ?? "")) {
      return true;
    }
  }
  // ...
}
```

**Narration:**
> "This is the payoff of Episode 3's `unknown`-narrowing episode, applied to the
> database specifically. A failed query could mean the database is genuinely
> unreachable, or it could mean a transient blip worth retrying, or it could mean
> a real constraint was violated and retrying would just fail the same way again.
> `isRetryableDatabaseFailure` checks Prisma's own error codes —
> `P1001` can't reach the server, `P2024` a connection pool timeout — codes that
> specifically mean 'this might work if you try again,' as opposed to, say, a
> unique constraint violation, which never will. Classifying the failure is what
> lets the rest of the app decide whether to retry, surface a clear 'service
> temporarily unavailable,' or fail fast."

---

## Outro / CTA (5:45–6:15)

**Visual:** End card, closing the playlist.

**Narration:**
> "That closes out Playlist D. We went from a plain-language domain to relations,
> to constraints, to history that never gets overwritten, to atomic writes, to
> indexed and aggregated reads, to migrations, and finally to the connection
> itself. Every one of those decisions came from a real requirement this
> application actually had — not a database tutorial's idea of what you might
> need someday."

---

## Production Notes

- **Screen recordings needed:** `src/lib/db.ts` (full file, 42 lines),
  `app/api/health/route.ts` (lines 1–26), `src/lib/api-response.ts`
  (`isConnectivityFailure` ~lines 68–79, `isRetryableDatabaseFailure` ~lines
  83–98).
- **Source material:** the files above, read directly from the repository.
- **B-roll:** a simple diagram for Scene 1 (many serverless function icons, one
  shared client) would help sell the "why" before the code appears.
- **Series note:** this closes the initial 8-episode run of Playlist D. All items
  from the blueprint's Playlist D topic list are covered (relational modeling,
  keys, relationships, constraints, temporal data, transactions, indexes, queries,
  aggregation, PostgreSQL-specific capabilities, Prisma schema/Client, migrations,
  error handling, connection management), with one honest scoping note carried
  from Episode 6: window functions have no real example in this codebase yet and
  were deliberately not forced into a script.
