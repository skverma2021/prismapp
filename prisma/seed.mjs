import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Configure it in .env before running seed.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

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

async function seedContributionHeads() {
  const heads = [
    { description: "Maintenance", payUnit: 1, period: "month" },
    { description: "Mandir", payUnit: 3, period: "month" },
  ];

  for (const head of heads) {
    await prisma.contributionHead.upsert({
      where: { description: head.description },
      update: { payUnit: head.payUnit, period: head.period },
      create: head,
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

async function main() {
  const currentYear = new Date().getUTCFullYear();

  await seedGenderTypes();
  await seedBlocks();
  await seedContributionHeads();
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
