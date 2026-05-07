-- Migration: correction_status_hooks
-- Adds maker-checker extension fields to the contributions table.
-- All new columns are nullable so existing rows and the single-step correction
-- flow require no data backfill. correctionStatus is set explicitly by the
-- service layer; null means the row is not a correction.

ALTER TABLE "contributions"
  ADD COLUMN "correctionStatus"          TEXT,
  ADD COLUMN "correctionApprovedById"    TEXT,
  ADD COLUMN "correctionApprovedAt"      TIMESTAMP(3),
  ADD COLUMN "correctionRejectedById"    TEXT,
  ADD COLUMN "correctionRejectedAt"      TIMESTAMP(3),
  ADD COLUMN "correctionRejectionReason" TEXT;

-- Backfill: existing correction rows (correctionOfContributionId IS NOT NULL)
-- are already live and counted, so they become POSTED.
UPDATE "contributions"
  SET "correctionStatus" = 'POSTED'
  WHERE "correctionOfContributionId" IS NOT NULL;

-- Index for pending-queue queries (checker dashboard, future use).
CREATE INDEX "contributions_correctionStatus_idx" ON "contributions"("correctionStatus");
