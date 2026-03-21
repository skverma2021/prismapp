import { PrismaClient } from "@prisma/client/index";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
}

// Reuse a single Prisma client in development to avoid exhausting connections
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before using Prisma.");
}

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
