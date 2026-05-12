import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

// Reuse a single Prisma client in development to avoid exhausting connections
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before using Prisma.");
}

// Enforce TLS in code rather than relying on ?sslmode=require in the URL.
// Prisma Postgres / Neon integration-managed URLs in Vercel cannot be manually
// edited to add sslmode, so we pass ssl explicitly to the pg adapter.
// In local dev (DATABASE_URL pointing to a local or CI postgres), ssl: false
// avoids connection errors on servers with no TLS configured.
const isLocalOrCi =
  connectionString.includes("localhost") ||
  connectionString.includes("127.0.0.1") ||
  connectionString.includes("ci:ci@");

const adapter = new PrismaPg({
  connectionString,
  ...(isLocalOrCi ? {} : { ssl: true }),
});

export const db =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = db;
}
