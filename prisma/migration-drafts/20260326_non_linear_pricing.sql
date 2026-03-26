-- Draft only. Do NOT run automatically.
-- Phase-2 proposal for non-linear pricing support.

ALTER TABLE "public"."contributions"
ADD COLUMN "pricingModelVersion" INTEGER,
ADD COLUMN "pricingNotes" TEXT;

ALTER TABLE "public"."contribution_details"
ADD COLUMN "baseAmount" DECIMAL(12,2),
ADD COLUMN "discountAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN "waiverAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN "surchargeAmount" DECIMAL(12,2) DEFAULT 0,
ADD COLUMN "netAmount" DECIMAL(12,2),
ADD COLUMN "pricingMode" VARCHAR(32),
ADD COLUMN "pricingBreakdownJson" JSONB;

ALTER TABLE "public"."contribution_details"
ADD CONSTRAINT "contribution_details_pricing_mode_check"
CHECK (
  "pricingMode" IS NULL OR
  "pricingMode" IN ('LINEAR', 'TIERED', 'DISCOUNTED', 'WAIVED', 'CUSTOM')
);

-- Consistency recommendation for application-level validation:
-- if netAmount is not null then netAmount = amt
-- if monetary extensions are provided then
-- netAmount = baseAmount - discountAmount - waiverAmount + surchargeAmount
