import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
