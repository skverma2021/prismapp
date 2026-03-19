import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // Use process.env directly so commands like `prisma generate` still work in CI.
    url: process.env.DATABASE_URL ?? "",
  },
});
