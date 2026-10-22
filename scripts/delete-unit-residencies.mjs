#!/usr/bin/env node
/**
 * delete-unit-residencies.mjs — delete every residency (unit_residents) row
 * for one unit, identified by block description + unit description.
 *
 * Nothing references unit_residents, so a single deleteMany is enough.
 * Individuals and the unit itself are left untouched.
 *
 * Usage:
 *   node scripts/delete-unit-residencies.mjs <block> <unit>             # dry run
 *   node scripts/delete-unit-residencies.mjs <block> <unit> --execute   # deletes
 *
 * Example: node scripts/delete-unit-residencies.mjs Nalanda 1001
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const execute = process.argv.includes("--execute");
const [blockDescription, unitDescription] = args;

if (!blockDescription || !unitDescription) {
  console.error("Usage: node scripts/delete-unit-residencies.mjs <block> <unit> [--execute]");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running this script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const unit = await prisma.unit.findFirst({
    where: { description: unitDescription, block: { description: blockDescription } },
    select: { id: true, description: true, block: { select: { description: true } } },
  });

  if (!unit) {
    console.log(`[residencies] Unit "${unitDescription}" not found in block "${blockDescription}". Nothing to do.`);
    return;
  }

  const residencies = await prisma.unitResident.findMany({
    where: { unitId: unit.id },
    include: { individual: { select: { id: true, fName: true, sName: true } } },
    orderBy: { fromDt: "asc" },
  });

  console.log(`[residencies] ${unit.block.description} / ${unit.description}: ${residencies.length} row(s)`);
  for (const r of residencies) {
    const name = `${r.individual.fName} ${r.individual.sName}`;
    console.log(
      `  ${r.id}  ${name}  ${r.fromDt.toISOString().slice(0, 10)} -> ${r.toDt ? r.toDt.toISOString().slice(0, 10) : "open"}`,
    );
  }

  if (residencies.length === 0) return;

  if (!execute) {
    console.log("\n[residencies] Dry run only — no rows were deleted. Re-run with --execute to apply.");
    return;
  }

  const backupsDir = resolve(projectRoot, "backups");
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = resolve(backupsDir, `delete-residencies-${blockDescription}-${unitDescription}-${stamp}.json`);
  writeFileSync(snapshotFile, JSON.stringify(residencies, null, 2));
  console.log(`[residencies] Snapshot written to ${snapshotFile}`);

  const result = await prisma.$transaction((tx) => tx.unitResident.deleteMany({ where: { unitId: unit.id } }));
  console.log(`[residencies] Deleted ${result.count} row(s).`);
}

main()
  .catch((err) => {
    console.error("[residencies] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
