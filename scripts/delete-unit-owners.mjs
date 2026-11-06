#!/usr/bin/env node
/**
 * delete-unit-owners.mjs — delete the ownership (unit_owners) rows for one unit,
 * identified by block description + unit description, EXCEPT rows that belong to
 * the builder inventory identity (Individual.systemTag = BUILDER_INVENTORY).
 *
 * Nothing references unit_owners, so a single deleteMany is enough. If the kept
 * builder_inventory row is closed (toDt set), it is reopened so the unit again has
 * an active owner and the normal "transfer ownership" flow works.
 * Individuals and the unit itself are left untouched.
 *
 * Usage:
 *   node scripts/delete-unit-owners.mjs [block] [unit]             # dry run
 *   node scripts/delete-unit-owners.mjs [block] [unit] --execute   # deletes
 *
 * Defaults: block = Nalanda, unit = 1001
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BUILDER_INVENTORY_TAG = "BUILDER_INVENTORY";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const execute = process.argv.includes("--execute");
const [blockDescription = "Nalanda", unitDescription = "1001"] = args;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running this script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const fmt = (d) => (d ? d.toISOString().slice(0, 10) : "open");

async function main() {
  const unit = await prisma.unit.findFirst({
    where: { description: unitDescription, block: { description: blockDescription } },
    select: { id: true, description: true, block: { select: { description: true } } },
  });

  if (!unit) {
    console.log(`[owners] Unit "${unitDescription}" not found in block "${blockDescription}". Nothing to do.`);
    return;
  }

  const owners = await prisma.unitOwner.findMany({
    where: { unitId: unit.id },
    include: { individual: { select: { id: true, fName: true, sName: true, systemTag: true } } },
    orderBy: { fromDt: "asc" },
  });

  const keep = owners.filter((o) => o.individual.systemTag === BUILDER_INVENTORY_TAG);
  const remove = owners.filter((o) => o.individual.systemTag !== BUILDER_INVENTORY_TAG);

  console.log(
    `[owners] ${unit.block.description} / ${unit.description}: ${owners.length} row(s) — ${remove.length} to delete, ${keep.length} builder_inventory kept`,
  );
  for (const o of keep) {
    console.log(`  KEEP    ${o.id}  ${o.individual.fName} ${o.individual.sName}  ${fmt(o.fromDt)} -> ${fmt(o.toDt)}`);
  }
  for (const o of remove) {
    console.log(`  DELETE  ${o.id}  ${o.individual.fName} ${o.individual.sName}  ${fmt(o.fromDt)} -> ${fmt(o.toDt)}`);
  }

  // Transfers need an active (open-ended) owner. After the natural owners are gone, the
  // builder row must be the open-ended tail of the timeline, so reopen it if it was closed.
  const reopen = keep.length > 0 && keep[keep.length - 1].toDt !== null ? keep[keep.length - 1] : null;
  if (reopen) {
    console.log(`  REOPEN  ${reopen.id}  builder_inventory toDt ${fmt(reopen.toDt)} -> open`);
  }

  if (remove.length === 0 && !reopen) return;

  if (!execute) {
    console.log("\n[owners] Dry run only — no rows were changed. Re-run with --execute to apply.");
    return;
  }

  const backupsDir = resolve(projectRoot, "backups");
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = resolve(backupsDir, `delete-owners-${blockDescription}-${unitDescription}-${stamp}.json`);
  writeFileSync(snapshotFile, JSON.stringify({ deleted: remove, reopened: reopen }, null, 2));
  console.log(`[owners] Snapshot written to ${snapshotFile}`);

  await prisma.$transaction(async (tx) => {
    const result = await tx.unitOwner.deleteMany({ where: { id: { in: remove.map((o) => o.id) } } });
    console.log(`[owners] Deleted ${result.count} row(s).`);
    if (reopen) {
      await tx.unitOwner.update({ where: { id: reopen.id }, data: { toDt: null } });
      console.log("[owners] Reopened builder_inventory row (toDt cleared).");
    }
  });
}

main()
  .catch((err) => {
    console.error("[owners] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
