#!/usr/bin/env node
/**
 * cleanup-test-contribution-heads.mjs — keep only the canonical contribution
 * heads (matched by id AND description) and delete every other head together
 * with the rows that hang off it.
 *
 * Every FK is `onDelete: Restrict`, so children are deleted in dependency order:
 *
 *   contribution_details (of removed-head contributions, or using removed-head rates)
 *   -> contributions (corrections, then originals)
 *   -> contribution_rates
 *   -> contribution_heads
 *
 * Contribution periods, units and individuals are untouched.
 *
 * Usage:
 *   node scripts/cleanup-test-contribution-heads.mjs             # dry run (default)
 *   node scripts/cleanup-test-contribution-heads.mjs --execute   # actually deletes
 *
 * --execute first writes a JSON snapshot of every affected row to backups/, which
 * serves as the backup. `npm run backup:db` (needs pg_dump) is optional.
 */

import "dotenv/config";

import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const KEEP_HEADS = [
  [1, "Maintenance"],
  [2, "Mandir"],
  [40, "Gymnasium"],
  [41, "Swimming Pool"],
  [42, "Holi"],
  [43, "Dusshera"],
  [44, "SaraswatiPuja"],
  [45, "Holi-Feast"],
  [46, "Dusshera-Feast"],
  [47, "SaraswatiPujaFeast"],
  [127, "Yoga Club Membership"],
  [158, "Photography club"],
  [159, "Rummy Club"],
  [160, "Flying Club"],
  [162, "Local Charity"],
  [163, "Republic Day"],
  [166, "Car Pool - Morabadi Morning Walk"],
];
const KEEP_IDS = KEEP_HEADS.map(([id]) => id);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running this script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const execute = process.argv.includes("--execute");

async function main() {
  const kept = await prisma.contributionHead.findMany({ where: { id: { in: KEEP_IDS } } });
  const keptById = new Map(kept.map((h) => [h.id, h]));
  const problems = [];
  for (const [id, description] of KEEP_HEADS) {
    const head = keptById.get(id);
    if (!head) problems.push(`  id ${id} ("${description}") does not exist`);
    else if (head.description !== description) {
      problems.push(`  id ${id} is "${head.description}", expected "${description}"`);
    }
  }
  if (problems.length > 0) {
    console.error("[heads] Keep-list does not match the database. Aborting:\n" + problems.join("\n"));
    process.exitCode = 1;
    return;
  }

  const headsToDelete = await prisma.contributionHead.findMany({
    where: { id: { notIn: KEEP_IDS } },
    orderBy: { id: "asc" },
  });

  if (headsToDelete.length === 0) {
    console.log("[heads] Nothing to do — only the canonical heads exist.");
    return;
  }

  const headIds = headsToDelete.map((h) => h.id);
  const contributionWhere = { contributionHeadId: { in: headIds } };
  const detailWhere = {
    OR: [
      { contribution: { contributionHeadId: { in: headIds } } },
      { contributionRate: { contributionHeadId: { in: headIds } } },
    ],
  };

  const [rateCount, contributionCount, detailCount, keptContribToRemovedRate] = await Promise.all([
    prisma.contributionRate.count({ where: { contributionHeadId: { in: headIds } } }),
    prisma.contribution.count({ where: contributionWhere }),
    prisma.contributionDetail.count({ where: detailWhere }),
    prisma.contributionDetail.count({
      where: {
        contribution: { contributionHeadId: { notIn: headIds } },
        contributionRate: { contributionHeadId: { in: headIds } },
      },
    }),
  ]);

  console.log(`[heads] Keeping ${KEEP_IDS.length} head(s).`);
  console.log(`[heads] Heads to remove (${headsToDelete.length}):`);
  for (const h of headsToDelete) console.log(`  ${h.id}\t${h.description}`);
  console.log("[heads] Row counts that will be deleted:");
  console.log(`  contribution_details: ${detailCount}`);
  console.log(`  contributions:        ${contributionCount}`);
  console.log(`  contribution_rates:   ${rateCount}`);
  console.log(`  contribution_heads:   ${headsToDelete.length}`);
  if (keptContribToRemovedRate > 0) {
    console.log(
      `[heads] WARNING: ${keptContribToRemovedRate} detail(s) of kept-head contributions use a removed head's rate; they will be deleted too.`,
    );
  }

  if (!execute) {
    console.log("\n[heads] Dry run only — no rows were deleted. Re-run with --execute to apply.");
    console.log("[heads] --execute saves a JSON snapshot of the affected rows to backups/ before deleting.");
    return;
  }

  console.log("\n[heads] --execute set — writing snapshot, then deleting...");

  const [heads, rates, contributions, details] = await Promise.all([
    Promise.resolve(headsToDelete),
    prisma.contributionRate.findMany({ where: { contributionHeadId: { in: headIds } } }),
    prisma.contribution.findMany({ where: contributionWhere }),
    prisma.contributionDetail.findMany({ where: detailWhere }),
  ]);

  const backupsDir = resolve(projectRoot, "backups");
  mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotFile = resolve(backupsDir, `cleanup-test-contribution-heads-${stamp}.json`);
  writeFileSync(snapshotFile, JSON.stringify({ heads, rates, contributions, details }, null, 2));
  console.log(`[heads] Snapshot written to ${snapshotFile}`);

  await prisma.$transaction(
    async (tx) => {
      await tx.contributionDetail.deleteMany({ where: detailWhere });

      // Corrections reference their original via correctionOfContributionId
      // (onDelete: Restrict) — delete correction rows before originals.
      await tx.contribution.deleteMany({
        where: { ...contributionWhere, correctionOfContributionId: { not: null } },
      });
      await tx.contribution.deleteMany({ where: contributionWhere });

      await tx.contributionRate.deleteMany({ where: { contributionHeadId: { in: headIds } } });
      await tx.contributionHead.deleteMany({ where: { id: { in: headIds } } });
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  console.log("[heads] Done.");
}

main()
  .catch((err) => {
    console.error("[heads] Failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
