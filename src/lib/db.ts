import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { retryOnSerializationConflict } from "./serialization";

declare global {
  var prisma: PrismaClient | undefined;
}

// Reuse a single Prisma client in development to avoid exhausting connections
const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before using Prisma.");
}

// pg-connection-string v3 / pg v9 will give 'require', 'prefer', 'verify-ca' libpq
// semantics (weaker than current behavior). Pin to 'verify-full' now to preserve
// current strong-TLS semantics and silence the deprecation warning.
function withVerifyFullSsl(url: string): string {
  try {
    const u = new URL(url);
    const mode = u.searchParams.get("sslmode");
    if (mode && mode !== "disable" && mode !== "verify-full") {
      u.searchParams.set("sslmode", "verify-full");
    }
    return u.toString();
  } catch {
    return url; // non-URL format (e.g. key=value), return unchanged
  }
}

const connectionString = withVerifyFullSsl(rawConnectionString);
const adapter = new PrismaPg({ connectionString });

export const db =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}

// Runs a read-check-write unit of work as a Serializable transaction. Use it
// where correctness depends on what other transactions are doing at the same
// time (temporal overlap checks, duplicate-payment checks, correction limits).
// Conflicts are retried a few times; domain errors are never retried.
export function runSerializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return retryOnSerializationConflict(() => db.$transaction(work, { isolationLevel: "Serializable" }));
}
