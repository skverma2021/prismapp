ALTER TABLE "public"."units"
ADD COLUMN "inceptionDt" TIMESTAMP(3);

UPDATE "public"."units" AS u
SET "inceptionDt" = COALESCE(
  (
    SELECT MIN(candidate."fromDt")
    FROM (
      SELECT o."fromDt"
      FROM "public"."unit_owners" AS o
      WHERE o."unitId" = u."id"

      UNION ALL

      SELECT r."fromDt"
      FROM "public"."unit_residents" AS r
      WHERE r."unitId" = u."id"
    ) AS candidate
  ),
  u."createdAt"
);

ALTER TABLE "public"."units"
ALTER COLUMN "inceptionDt" SET NOT NULL,
ALTER COLUMN "inceptionDt" SET DEFAULT CURRENT_TIMESTAMP;