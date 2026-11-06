#!/usr/bin/env node
/**
 * delete-table-rows.mjs — delete every row from one table in the public schema,
 * but only if no other table has a foreign key pointing at it AND holds rows.
 *
 * If child (referencing) tables with rows exist, their names and row counts are
 * listed and the script exits with code 1 without changing anything. Empty child
 * tables and self-references do not block. The table itself (structure, indexes,
 * constraints) is left in place.
 *
 * Usage:
 *   node scripts/delete-table-rows.mjs <table>              # dry run (default)
 *   node scripts/delete-table-rows.mjs <table> --execute    # snapshots rows to backups/, then DELETE
 *
 * <table> is the database table name (e.g. unit_owners), not the Prisma model name.
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const SCHEMA = "public";
const PROTECTED_TABLES = ["_prisma_migrations"];

const tableName = process.argv.slice(2).find((a) => !a.startsWith("--"));
const execute = process.argv.includes("--execute");

if (!tableName) {
  console.error("Usage: node scripts/delete-table-rows.mjs <table> [--execute]");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running this script.");
}

const quoteIdent = (name) => `"${name.replace(/"/g, '""')}"`;

async function main(client) {
  if (PROTECTED_TABLES.includes(tableName)) {
    console.error(`[delete-rows] "${tableName}" is protected and cannot be emptied by this script.`);
    process.exitCode = 1;
    return;
  }

  const exists = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = $2 AND table_type = 'BASE TABLE'`,
    [SCHEMA, tableName],
  );
  if (exists.rowCount === 0) {
    console.error(`[delete-rows] Table "${SCHEMA}.${tableName}" does not exist.`);
    process.exitCode = 1;
    return;
  }

  const children = await client.query(
    `SELECT DISTINCT cn.nspname AS child_schema, cc.relname AS child_table
     FROM pg_constraint con
     JOIN pg_class pc ON pc.oid = con.confrelid
     JOIN pg_namespace pn ON pn.oid = pc.relnamespace
     JOIN pg_class cc ON cc.oid = con.conrelid
     JOIN pg_namespace cn ON cn.oid = cc.relnamespace
     WHERE con.contype = 'f'
       AND pn.nspname = $1
       AND pc.relname = $2
       AND con.conrelid <> con.confrelid
     ORDER BY child_schema, child_table`,
    [SCHEMA, tableName],
  );

  const childRows = [];
  for (const r of children.rows) {
    const childQualified = `${quoteIdent(r.child_schema)}.${quoteIdent(r.child_table)}`;
    const { rows: countRows } = await client.query(`SELECT count(*)::int AS n FROM ${childQualified}`);
    childRows.push({ name: `${r.child_schema}.${r.child_table}`, count: countRows[0].n });
  }
  const blocking = childRows.filter((c) => c.count > 0);

  if (blocking.length > 0) {
    console.error(`[delete-rows] Cannot delete rows from "${tableName}": ${blocking.length} table(s) reference it and contain rows:`);
    for (const c of blocking) console.error(`  ${c.name} (${c.count} row(s))`);
    process.exitCode = 1;
    return;
  }
  if (childRows.length > 0) {
    console.log(`[delete-rows] Referencing table(s) are empty, so they do not block: ${childRows.map((c) => c.name).join(", ")}`);
  }

  const qualified = `${quoteIdent(SCHEMA)}.${quoteIdent(tableName)}`;
  const { rows } = await client.query(`SELECT * FROM ${qualified}`);
  console.log(`[delete-rows] "${tableName}" has ${rows.length} row(s) and no populated dependent tables.`);

  if (rows.length === 0) return;

  if (!execute) {
    console.log("\n[delete-rows] Dry run only — no rows were deleted. Re-run with --execute to apply.");
    return;
  }

  const backupsDir = resolve(projectRoot, "backups");
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = resolve(backupsDir, `delete-rows-${tableName}-${stamp}.json`);
  writeFileSync(snapshotFile, JSON.stringify(rows, null, 2));
  console.log(`[delete-rows] Snapshot written to ${snapshotFile}`);

  const result = await client.query(`DELETE FROM ${qualified}`);
  console.log(`[delete-rows] Deleted ${result.rowCount} row(s) from ${SCHEMA}.${tableName}.`);
}

const client = new pg.Client({ connectionString });
await client.connect();
try {
  await main(client);
} catch (err) {
  console.error("[delete-rows] Failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
