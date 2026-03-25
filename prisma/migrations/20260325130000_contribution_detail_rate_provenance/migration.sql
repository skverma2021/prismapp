ALTER TABLE "contribution_details"
ADD COLUMN "contributionRateId" INTEGER,
ADD COLUMN "appliedRateReference" TEXT;

CREATE INDEX "contribution_details_contributionRateId_idx"
ON "contribution_details"("contributionRateId");

ALTER TABLE "contribution_details"
ADD CONSTRAINT "contribution_details_contributionRateId_fkey"
FOREIGN KEY ("contributionRateId") REFERENCES "contribution_rates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
