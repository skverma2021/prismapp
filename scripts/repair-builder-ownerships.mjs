import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const BUILDER_INVENTORY_TAG = "BUILDER_INVENTORY";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it before running the repair script.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

function toKey(row) {
  return [
    row.unitId,
    row.indId,
    row.fromDt.toISOString(),
    row.toDt ? row.toDt.toISOString() : "null",
  ].join("|");
}

function describeRow(row) {
  const unitLabel = row.unit?.block?.description
    ? `${row.unit.block.description}, ${row.unit.description}`
    : row.unitId;

  return `${unitLabel} | ${row.fromDt.toISOString().slice(0, 10)} -> ${row.toDt ? row.toDt.toISOString().slice(0, 10) : "ACTIVE"}`;
}

function collectRedundantBuilderRows(rows) {
  const sorted = [...rows].sort((left, right) => {
    const leftTime = left.fromDt.getTime();
    const rightTime = right.fromDt.getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.createdAt.getTime() - right.createdAt.getTime();
  });

  const duplicateIds = new Set();
  const seenKeys = new Set();
  let activeBuilderSeen = false;

  for (const row of sorted) {
    const key = toKey(row);
    if (seenKeys.has(key)) {
      duplicateIds.add(row.id);
      continue;
    }

    seenKeys.add(key);

    if (activeBuilderSeen) {
      duplicateIds.add(row.id);
      continue;
    }

    if (row.toDt === null) {
      activeBuilderSeen = true;
    }
  }

  return sorted.filter((row) => duplicateIds.has(row.id));
}

async function main() {
  const apply = process.argv.includes("--apply");

  const builder = await prisma.individual.findUnique({
    where: { systemTag: BUILDER_INVENTORY_TAG },
    select: { id: true },
  });

  if (!builder) {
    console.log("Builder inventory identity not found. Nothing to repair.");
    return;
  }

  const builderRows = await prisma.unitOwner.findMany({
    where: {
      indId: builder.id,
    },
    include: {
      unit: {
        select: {
          description: true,
          block: {
            select: {
              description: true,
            },
          },
        },
      },
    },
    orderBy: [{ unitId: "asc" }, { fromDt: "asc" }, { createdAt: "asc" }],
  });

  const rowsByUnit = new Map();
  for (const row of builderRows) {
    const existing = rowsByUnit.get(row.unitId) ?? [];
    existing.push(row);
    rowsByUnit.set(row.unitId, existing);
  }

  const redundantRows = [];
  for (const rows of rowsByUnit.values()) {
    redundantRows.push(...collectRedundantBuilderRows(rows));
  }

  if (redundantRows.length === 0) {
    console.log("No redundant builder ownership rows detected.");
    return;
  }

  console.log(`Detected ${redundantRows.length} redundant builder ownership row(s).`);
  for (const row of redundantRows) {
    console.log(`- ${row.id} | ${describeRow(row)}`);
  }

  if (!apply) {
    console.log("Dry run only. Re-run with --apply to delete the rows listed above.");
    return;
  }

  await prisma.unitOwner.deleteMany({
    where: {
      id: {
        in: redundantRows.map((row) => row.id),
      },
    },
  });

  console.log(`Deleted ${redundantRows.length} redundant builder ownership row(s).`);
}

main()
  .catch((error) => {
    console.error("Builder ownership repair failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });