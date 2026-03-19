-- CreateTable
CREATE TABLE "blocks" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "sqFt" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gender_types" (
    "id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gender_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "individuals" (
    "id" TEXT NOT NULL,
    "fName" TEXT NOT NULL,
    "mName" TEXT,
    "sName" TEXT NOT NULL,
    "eMail" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "altMobile" TEXT,
    "genderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "individuals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_owners" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "indId" TEXT NOT NULL,
    "fromDt" TIMESTAMP(3) NOT NULL,
    "toDt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_residents" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "indId" TEXT NOT NULL,
    "fromDt" TIMESTAMP(3) NOT NULL,
    "toDt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unit_residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_heads" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "payUnit" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contribution_heads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_rates" (
    "id" SERIAL NOT NULL,
    "contributionHeadId" INTEGER NOT NULL,
    "reference" TEXT,
    "fromDt" TIMESTAMP(3) NOT NULL,
    "toDt" TIMESTAMP(3),
    "amt" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_periods" (
    "id" SERIAL NOT NULL,
    "refMonth" INTEGER NOT NULL,
    "refYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contributions" (
    "id" SERIAL NOT NULL,
    "unitId" TEXT NOT NULL,
    "contributionHeadId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "periodCount" INTEGER NOT NULL,
    "transactionId" TEXT NOT NULL,
    "transactionDateTime" TIMESTAMP(3) NOT NULL,
    "depositedBy" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "correctionOfContributionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_details" (
    "id" SERIAL NOT NULL,
    "contributionId" INTEGER NOT NULL,
    "contributionPeriodId" INTEGER NOT NULL,
    "amt" DECIMAL(12,2) NOT NULL,
    "appliedRate" DECIMAL(12,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contribution_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocks_description_key" ON "blocks"("description");

-- CreateIndex
CREATE INDEX "units_blockId_idx" ON "units"("blockId");

-- CreateIndex
CREATE UNIQUE INDEX "units_blockId_description_key" ON "units"("blockId", "description");

-- CreateIndex
CREATE UNIQUE INDEX "gender_types_description_key" ON "gender_types"("description");

-- CreateIndex
CREATE UNIQUE INDEX "individuals_eMail_key" ON "individuals"("eMail");

-- CreateIndex
CREATE UNIQUE INDEX "individuals_mobile_key" ON "individuals"("mobile");

-- CreateIndex
CREATE INDEX "individuals_sName_fName_idx" ON "individuals"("sName", "fName");

-- CreateIndex
CREATE INDEX "unit_owners_unitId_fromDt_toDt_idx" ON "unit_owners"("unitId", "fromDt", "toDt");

-- CreateIndex
CREATE INDEX "unit_owners_indId_fromDt_toDt_idx" ON "unit_owners"("indId", "fromDt", "toDt");

-- CreateIndex
CREATE INDEX "unit_residents_unitId_fromDt_toDt_idx" ON "unit_residents"("unitId", "fromDt", "toDt");

-- CreateIndex
CREATE INDEX "unit_residents_indId_fromDt_toDt_idx" ON "unit_residents"("indId", "fromDt", "toDt");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_heads_description_key" ON "contribution_heads"("description");

-- CreateIndex
CREATE INDEX "contribution_rates_contributionHeadId_fromDt_toDt_idx" ON "contribution_rates"("contributionHeadId", "fromDt", "toDt");

-- CreateIndex
CREATE INDEX "contribution_periods_refYear_idx" ON "contribution_periods"("refYear");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_periods_refYear_refMonth_key" ON "contribution_periods"("refYear", "refMonth");

-- CreateIndex
CREATE INDEX "contributions_unitId_contributionHeadId_idx" ON "contributions"("unitId", "contributionHeadId");

-- CreateIndex
CREATE INDEX "contributions_transactionDateTime_idx" ON "contributions"("transactionDateTime");

-- CreateIndex
CREATE INDEX "contributions_depositedBy_idx" ON "contributions"("depositedBy");

-- CreateIndex
CREATE INDEX "contribution_details_contributionPeriodId_idx" ON "contribution_details"("contributionPeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "contribution_details_contributionId_contributionPeriodId_key" ON "contribution_details"("contributionId", "contributionPeriodId");

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "blocks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "individuals" ADD CONSTRAINT "individuals_genderId_fkey" FOREIGN KEY ("genderId") REFERENCES "gender_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_owners" ADD CONSTRAINT "unit_owners_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_owners" ADD CONSTRAINT "unit_owners_indId_fkey" FOREIGN KEY ("indId") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_residents" ADD CONSTRAINT "unit_residents_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_residents" ADD CONSTRAINT "unit_residents_indId_fkey" FOREIGN KEY ("indId") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_rates" ADD CONSTRAINT "contribution_rates_contributionHeadId_fkey" FOREIGN KEY ("contributionHeadId") REFERENCES "contribution_heads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_contributionHeadId_fkey" FOREIGN KEY ("contributionHeadId") REFERENCES "contribution_heads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_depositedBy_fkey" FOREIGN KEY ("depositedBy") REFERENCES "individuals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contributions" ADD CONSTRAINT "contributions_correctionOfContributionId_fkey" FOREIGN KEY ("correctionOfContributionId") REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_details" ADD CONSTRAINT "contribution_details_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "contributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contribution_details" ADD CONSTRAINT "contribution_details_contributionPeriodId_fkey" FOREIGN KEY ("contributionPeriodId") REFERENCES "contribution_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
