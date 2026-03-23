ALTER TABLE "contributions"
ADD COLUMN "correctionReasonCode" TEXT,
ADD COLUMN "correctionReasonText" TEXT;

CREATE INDEX "contributions_correctionOfContributionId_idx"
ON "contributions"("correctionOfContributionId");
