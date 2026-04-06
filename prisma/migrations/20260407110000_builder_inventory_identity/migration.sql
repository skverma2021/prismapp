ALTER TABLE "public"."individuals"
ADD COLUMN "isSystemIdentity" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "systemTag" TEXT;

CREATE UNIQUE INDEX "individuals_systemTag_key" ON "public"."individuals"("systemTag");