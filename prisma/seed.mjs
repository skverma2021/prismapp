import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before running seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const BUILDER_INVENTORY_TAG = "BUILDER_INVENTORY";

function addDays(value, days) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function hasMatchingOwnershipRow(rows, builderId, fromDt, toDt) {
  return rows.some(
    (row) =>
      row.indId === builderId &&
      row.fromDt.getTime() === fromDt.getTime() &&
      ((row.toDt === null && toDt === null) ||
        (row.toDt !== null && toDt !== null && row.toDt.getTime() === toDt.getTime()))
  );
}

async function seedGenderTypes() {
  const entries = [
    { id: 0, description: "Male" },
    { id: 1, description: "Female" },
    { id: 2, description: "Other" },
  ];

  for (const entry of entries) {
    await prisma.genderType.upsert({
      where: { id: entry.id },
      update: { description: entry.description },
      create: entry,
    });
  }
}

async function seedBlocks() {
  const blockDescriptions = ["Nalanda", "Vaishali", "Rajgir"];

  for (const description of blockDescriptions) {
    await prisma.block.upsert({
      where: { description },
      update: {},
      create: { description },
    });
  }
}

async function seedBuilderInventoryIdentity() {
  await prisma.individual.upsert({
    where: { systemTag: BUILDER_INVENTORY_TAG },
    update: {
      fName: "Builder",
      mName: null,
      sName: "Inventory",
      eMail: "builder.inventory@prismapp.local",
      mobile: "0000000000",
      altMobile: null,
      genderId: 2,
      isSystemIdentity: true,
    },
    create: {
      fName: "Builder",
      mName: null,
      sName: "Inventory",
      eMail: "builder.inventory@prismapp.local",
      mobile: "0000000000",
      altMobile: null,
      genderId: 2,
      isSystemIdentity: true,
      systemTag: BUILDER_INVENTORY_TAG,
    },
  });
}

async function seedUnits() {
  const blocks = await prisma.block.findMany({
    select: { id: true, description: true },
    orderBy: { description: "asc" },
  });

  const sqFtByColumn = [900, 925, 950, 975, 1000, 1025, 1050, 1075];
  const inceptionDt = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));

  for (const block of blocks) {
    for (let floor = 1; floor <= 14; floor += 1) {
      for (let column = 1; column <= 8; column += 1) {
        const description = `${floor}${String(column).padStart(2, "0")}`;

        await prisma.unit.upsert({
          where: {
            blockId_description: {
              blockId: block.id,
              description,
            },
          },
          update: {
            sqFt: sqFtByColumn[column - 1],
            inceptionDt,
          },
          create: {
            blockId: block.id,
            description,
            sqFt: sqFtByColumn[column - 1],
            inceptionDt,
          },
        });
      }
    }
  }
}

async function seedOwnershipBootstrap() {
  const builder = await prisma.individual.findUnique({
    where: { systemTag: BUILDER_INVENTORY_TAG },
    select: { id: true },
  });

  if (!builder) {
    throw new Error("Builder inventory identity is required before ownership bootstrap.");
  }

  const units = await prisma.unit.findMany({
    select: {
      id: true,
      inceptionDt: true,
      owners: {
        select: {
          id: true,
          indId: true,
          fromDt: true,
          toDt: true,
        },
        orderBy: [{ fromDt: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  for (const unit of units) {
    if (unit.owners.length === 0) {
      if (!hasMatchingOwnershipRow(unit.owners, builder.id, unit.inceptionDt, null)) {
        await prisma.unitOwner.create({
          data: {
            unitId: unit.id,
            indId: builder.id,
            fromDt: unit.inceptionDt,
            toDt: null,
          },
        });
      }
      continue;
    }

    const firstOwner = unit.owners[0];
    if (firstOwner.fromDt.getTime() < unit.inceptionDt.getTime()) {
      await prisma.unit.update({
        where: { id: unit.id },
        data: { inceptionDt: firstOwner.fromDt },
      });
      unit.inceptionDt = firstOwner.fromDt;
    }

    let expectedFrom = unit.inceptionDt;

    for (const owner of unit.owners) {
      if (owner.fromDt.getTime() > expectedFrom.getTime()) {
        const gapToDt = addDays(owner.fromDt, -1);

        if (!hasMatchingOwnershipRow(unit.owners, builder.id, expectedFrom, gapToDt)) {
          await prisma.unitOwner.create({
            data: {
              unitId: unit.id,
              indId: builder.id,
              fromDt: expectedFrom,
              toDt: gapToDt,
            },
          });

          unit.owners.push({
            id: `bootstrap-${unit.id}-${expectedFrom.toISOString()}`,
            indId: builder.id,
            fromDt: expectedFrom,
            toDt: gapToDt,
          });
        }
      }

      if (owner.toDt === null) {
        expectedFrom = null;
        break;
      }

      expectedFrom = addDays(owner.toDt, 1);
    }

    if (expectedFrom) {
      if (!hasMatchingOwnershipRow(unit.owners, builder.id, expectedFrom, null)) {
        await prisma.unitOwner.create({
          data: {
            unitId: unit.id,
            indId: builder.id,
            fromDt: expectedFrom,
            toDt: null,
          },
        });
      }
    }
  }
}

async function seedContributionHeads() {
  const heads = [
    { description: "Maintenance", payUnit: 1, period: "MONTH" },
    { description: "Mandir", payUnit: 3, period: "MONTH" },
    { description: "Gymnasium", payUnit: 2, period: "MONTH" },
    { description: "Swimming Pool", payUnit: 2, period: "MONTH" },
    { description: "Holi", payUnit: 3, period: "YEAR" },
    { description: "Dusshera", payUnit: 3, period: "YEAR" },
    { description: "SaraswatiPuja", payUnit: 3, period: "YEAR" },
    { description: "Holi-Feast", payUnit: 2, period: "YEAR" },
    { description: "Dusshera-Feast", payUnit: 2, period: "YEAR" },
    { description: "SaraswatiPujaFeast", payUnit: 2, period: "YEAR" },
  ];

  for (const head of heads) {
    await prisma.contributionHead.upsert({
      where: { description: head.description },
      update: { payUnit: head.payUnit, period: head.period },
      create: head,
    });
  }
}

function toSeedRef(description, year) {
  const slug = description
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `seed-default-${year}-${slug}`;
}

function addUtcDays(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

async function seedContributionRates(year) {
  const fromDt = new Date(Date.UTC(year, 0, 1));
  const defaults = [
    { description: "Maintenance", amt: 2.5 },
    { description: "Mandir", amt: 100 },
    { description: "Gymnasium", amt: 100 },
    { description: "Swimming Pool", amt: 120 },
    { description: "Holi", amt: 500 },
    { description: "Dusshera", amt: 500 },
    { description: "SaraswatiPuja", amt: 500 },
    { description: "Holi-Feast", amt: 200 },
    { description: "Dusshera-Feast", amt: 200 },
    { description: "SaraswatiPujaFeast", amt: 200 },
  ];

  for (const item of defaults) {
    const head = await prisma.contributionHead.findUnique({
      where: { description: item.description },
      select: { id: true },
    });

    if (!head) {
      continue;
    }

    const reference = toSeedRef(item.description, year);

    const existing = await prisma.contributionRate.findFirst({
      where: {
        contributionHeadId: head.id,
        reference,
      },
      select: { id: true },
    });

    const nextSuccessor = await prisma.contributionRate.findFirst({
      where: {
        contributionHeadId: head.id,
        reference: { not: reference },
        fromDt: { gt: fromDt },
      },
      orderBy: [{ fromDt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        fromDt: true,
      },
    });

    const seededToDt = nextSuccessor ? addUtcDays(nextSuccessor.fromDt, -1) : null;

    if (existing) {
      await prisma.contributionRate.update({
        where: { id: existing.id },
        data: {
          fromDt,
          toDt: seededToDt,
          amt: item.amt,
        },
      });
      continue;
    }

    await prisma.contributionRate.create({
      data: {
        contributionHeadId: head.id,
        reference,
        fromDt,
        toDt: seededToDt,
        amt: item.amt,
      },
    });
  }
}

async function seedContributionPeriods(year) {
  for (let refMonth = 0; refMonth <= 12; refMonth += 1) {
    await prisma.contributionPeriod.upsert({
      where: {
        refYear_refMonth: {
          refYear: year,
          refMonth,
        },
      },
      update: {},
      create: {
        refYear: year,
        refMonth,
      },
    });
  }
}

async function seedAppUsers() {
  const password = process.env.AUTH_SEED_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await bcrypt.hash(password, 10);
  const entries = [
    {
      email: "admin@prismapp.local",
      displayName: "Society Admin",
      role: "SOCIETY_ADMIN",
    },
    {
      email: "manager@prismapp.local",
      displayName: "Operations Manager",
      role: "MANAGER",
    },
    {
      email: "readonly@prismapp.local",
      displayName: "Read-Only Auditor",
      role: "READ_ONLY",
    },
  ];

  for (const entry of entries) {
    await prisma.appUser.upsert({
      where: { email: entry.email },
      update: {
        displayName: entry.displayName,
        role: entry.role,
        isActive: true,
        passwordHash,
      },
      create: {
        ...entry,
        isActive: true,
        passwordHash,
      },
    });
  }
}

async function main() {
  const currentYear = new Date().getUTCFullYear();

  await seedGenderTypes();
  await seedBuilderInventoryIdentity();
  await seedAppUsers();
  await seedBlocks();
  await seedUnits();
  await seedOwnershipBootstrap();
  await seedContributionHeads();
  await seedContributionRates(currentYear);
  await seedContributionPeriods(currentYear);

  console.log(`Seed complete for year ${currentYear}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
