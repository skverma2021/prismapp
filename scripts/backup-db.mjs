#!/usr/bin/env node
/**
 * backup-db.mjs — manual pg_dump wrapper for PrismApp (Track-A 8.6)
 *
 * Usage:
 *   node scripts/backup-db.mjs
 *   npm run backup:db
 *
 * Requires:
 *   - PostgreSQL client tools installed locally (pg_dump in PATH)
 *   - DATABASE_URL set in .env (or environment)
 *
 * Output:
 *   backups/prismapp-YYYY-MM-DD-HHmmss.sql.gz
 *
 * The backups/ directory is git-ignored — never commit dump files.
 *
 * Restore:
 *   gunzip -c backups/<file>.sql.gz | psql "$DATABASE_URL"
 */

import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// ---------------------------------------------------------------------------
// Load environment
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

config({ path: resolve(projectRoot, ".env") });
config({ path: resolve(projectRoot, ".env.local"), override: true });

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("ERROR: DATABASE_URL is not set. Configure it in .env before running backups.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Check pg_dump is available
// ---------------------------------------------------------------------------
try {
  execSync("pg_dump --version", { stdio: "pipe" });
} catch {
  console.error(
    "ERROR: pg_dump not found in PATH.\n" +
    "Install PostgreSQL client tools:\n" +
    "  Windows : https://www.postgresql.org/download/windows/ (select 'Command Line Tools')\n" +
    "  macOS   : brew install libpq && brew link --force libpq\n" +
    "  Ubuntu  : sudo apt-get install postgresql-client"
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build output path
// ---------------------------------------------------------------------------
const now = new Date();
const stamp =
  now.getUTCFullYear().toString() +
  (now.getUTCMonth() + 1).toString().padStart(2, "0") +
  now.getUTCDate().toString().padStart(2, "0") +
  "-" +
  now.getUTCHours().toString().padStart(2, "0") +
  now.getUTCMinutes().toString().padStart(2, "0") +
  now.getUTCSeconds().toString().padStart(2, "0");

const backupsDir = resolve(projectRoot, "backups");
if (!existsSync(backupsDir)) {
  mkdirSync(backupsDir, { recursive: true });
}

const outFile = resolve(backupsDir, `prismapp-${stamp}.sql`);

// ---------------------------------------------------------------------------
// Run pg_dump
// ---------------------------------------------------------------------------
console.log(`[backup] Starting pg_dump → ${outFile}`);

try {
  execFileSync(
    "pg_dump",
    [
      "--no-password",
      "--format=plain",     // plain SQL — human-readable and portable
      "--no-owner",         // omit ownership statements for easy restore
      "--no-acl",           // omit GRANT/REVOKE statements
      "--file", outFile,
      rawUrl,
    ],
    {
      stdio: ["ignore", "inherit", "inherit"],
      // pg_dump reads the URL directly — no need to split into env vars
    }
  );
} catch (err) {
  console.error("[backup] pg_dump failed:", err.message);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
import { statSync } from "node:fs";
const { size } = statSync(outFile);
const sizeMb = (size / 1024 / 1024).toFixed(2);

console.log(`[backup] Done. ${outFile} (${sizeMb} MB)`);
console.log();
console.log("Restore with:");
console.log(`  psql "$DATABASE_URL" < "${outFile}"`);
