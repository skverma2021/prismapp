#!/usr/bin/env node
/**
 * cleanup-test-blocks.mjs — remove ad-hoc test blocks (and every row that
 * hangs off them) so only the canonical seed blocks remain.
 *
 * Every FK from Block downward is `onDelete: Restrict`, so children must be
 * deleted in dependency order before their parents:
 *
 *   contribution_details -> contributions (corrections, then originals)
 *   complaint_notes -> complaints
 *   unit_owners / unit_residents
 *   units
 *   blocks
 *
 * Bookings/resources are untouched — they reference Resource, not Unit.
 * Individuals are untouched — they may be shared with kept blocks; deleting
 * them is out of scope for this cleanup.
 *
 * Usage:
 *   node scripts/cleanup-test-blocks.mjs                 # dry run (default) — reports counts only
 *   node scripts/cleanup-test-blocks.mjs --execute        # actually deletes
 *
 * Always run `npm run backup:db` before using --execute.
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const KEEP_BLOCK_DESCRIPTIONS = ["Nalanda", "Vaishali", "Rajgir"];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running this script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const execute = process.argv.includes("--execute");

async function main() {
  const blocksToDelete = await prisma.block.findMany({
    where: { description: { notIn: KEEP_BLOCK_DESCRIPTIONS } },
    select: { id: true, description: true },
    orderBy: { description: "asc" },
  });

  if (blocksToDelete.length === 0) {
    console.log("[cleanup] Nothing to do — only the canonical blocks exist.");
    return;
  }

  const blockIds = blocksToDelete.map((b) => b.id);

  const [unitCount, ownerCount, residentCount, contributionCount, detailCount, complaintCount, noteCount] =
    await Promise.all([
      prisma.unit.count({ where: { blockId: { in: blockIds } } }),
      prisma.unitOwner.count({ where: { unit: { blockId: { in: blockIds } } } }),
      prisma.unitResident.count({ where: { unit: { blockId: { in: blockIds } } } }),
      prisma.contribution.count({ where: { unit: { blockId: { in: blockIds } } } }),
      prisma.contributionDetail.count({ where: { contribution: { unit: { blockId: { in: blockIds } } } } }),
      prisma.complaint.count({ where: { unit: { blockId: { in: blockIds } } } }),
      prisma.complaintNote.count({ where: { complaint: { unit: { blockId: { in: blockIds } } } } }),
    ]);

  console.log(`[cleanup] Keeping: ${KEEP_BLOCK_DESCRIPTIONS.join(", ")}`);
  console.log(`[cleanup] Blocks to remove (${blocksToDelete.length}): ${blocksToDelete.map((b) => b.description).join(", ")}`);
  console.log("[cleanup] Row counts that will be deleted:");
  console.log(`  units:                ${unitCount}`);
  console.log(`  unit_owners:          ${ownerCount}`);
  console.log(`  unit_residents:       ${residentCount}`);
  console.log(`  contributions:        ${contributionCount}`);
  console.log(`  contribution_details: ${detailCount}`);
  console.log(`  complaints:           ${complaintCount}`);
  console.log(`  complaint_notes:      ${noteCount}`);

  if (!execute) {
    console.log("\n[cleanup] Dry run only — no rows were deleted. Re-run with --execute to apply.");
    console.log("[cleanup] Recommended: run `npm run backup:db` first.");
    return;
  }

  console.log("\n[cleanup] --execute set — deleting now...");

  console.log("[cleanup] Writing JSON snapshot of affected rows before deleting...");
  const [blocks, units, owners, residents, contributions, details, complaints, notes] = await Promise.all([
    prisma.block.findMany({ where: { id: { in: blockIds } } }),
    prisma.unit.findMany({ where: { blockId: { in: blockIds } } }),
    prisma.unitOwner.findMany({ where: { unit: { blockId: { in: blockIds } } } }),
    prisma.unitResident.findMany({ where: { unit: { blockId: { in: blockIds } } } }),
    prisma.contribution.findMany({ where: { unit: { blockId: { in: blockIds } } } }),
    prisma.contributionDetail.findMany({ where: { contribution: { unit: { blockId: { in: blockIds } } } } }),
    prisma.complaint.findMany({ where: { unit: { blockId: { in: blockIds } } } }),
    prisma.complaintNote.findMany({ where: { complaint: { unit: { blockId: { in: blockIds } } } } }),
  ]);

  const backupsDir = resolve(projectRoot, "backups");
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = resolve(backupsDir, `cleanup-test-blocks-${stamp}.json`);
  writeFileSync(
    snapshotFile,
    JSON.stringify({ blocks, units, owners, residents, contributions, details, complaints, notes }, null, 2),
  );
  console.log(`[cleanup] Snapshot written to ${snapshotFile}`);

  await prisma.$transaction(
    async (tx) => {
      await tx.contributionDetail.deleteMany({
        where: { contribution: { unit: { blockId: { in: blockIds } } } },
      });

      // Corrections reference their original via correctionOfContributionId
      // (onDelete: Restrict) — delete correction rows before originals.
      await tx.contribution.deleteMany({
        where: {
          unit: { blockId: { in: blockIds } },
          correctionOfContributionId: { not: null },
        },
      });
      await tx.contribution.deleteMany({
        where: { unit: { blockId: { in: blockIds } } },
      });

      await tx.complaintNote.deleteMany({
        where: { complaint: { unit: { blockId: { in: blockIds } } } },
      });
      await tx.complaint.deleteMany({
        where: { unit: { blockId: { in: blockIds } } },
      });

      await tx.unitOwner.deleteMany({ where: { unit: { blockId: { in: blockIds } } } });
      await tx.unitResident.deleteMany({ where: { unit: { blockId: { in: blockIds } } } });

      await tx.unit.deleteMany({ where: { blockId: { in: blockIds } } });
      await tx.block.deleteMany({ where: { id: { in: blockIds } } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  console.log("[cleanup] Done.");
}

main()
  .catch((err) => {
    console.error("[cleanup] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
