import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { CreateResidencyInput, UpdateResidencyInput } from "./residencies.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 500;

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}

async function ensureResidencyReferencesExist(
  tx: Pick<typeof db, "unit" | "individual">,
  unitId: string,
  indId: string
) {
  const [unit, individual] = await Promise.all([
    tx.unit.findUnique({ where: { id: unitId }, select: { id: true, inceptionDt: true } }),
    tx.individual.findUnique({ where: { id: indId }, select: { id: true } }),
  ]);

  if (!unit) {
    throw new HttpError(404, "NOT_FOUND", "Unit not found.");
  }

  if (!individual) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  return unit;
}

function ensureNotBeforeUnitInception(unitInceptionDt: Date, fromDt: Date, label: string) {
  if (fromDt.getTime() < unitInceptionDt.getTime()) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `${label} cannot be earlier than the unit inception date (${unitInceptionDt.toISOString().slice(0, 10)}).`
    );
  }
}

async function ensureNoResidencyOverlap(
  tx: Pick<typeof db, "unitResident">,
  unitId: string,
  fromDt: Date,
  toDt: Date | null,
  excludeId?: string
) {
  const existing = await tx.unitResident.findMany({
    where: {
      unitId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const hasOverlap = existing.some((row) => rangesOverlap(fromDt, toDt, row.fromDt, row.toDt));
  if (hasOverlap) {
    throw new HttpError(409, "CONFLICT", "Residency period overlaps with an existing residency for this unit.");
  }
}

export async function listResidencies(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const unitId = searchParams.get("unitId")?.trim();
  const indId = searchParams.get("indId")?.trim();
  const activeOnlyParam = searchParams.get("activeOnly");
  const activeOnly =
    activeOnlyParam === null
      ? undefined
      : activeOnlyParam === "true"
        ? true
        : activeOnlyParam === "false"
          ? false
          : (() => {
              throw new HttpError(400, "VALIDATION_ERROR", "activeOnly must be true or false.");
            })();

  const sortBy = searchParams.get("sortBy") ?? "fromDt";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["fromDt", "toDt", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const now = new Date();

  const where = {
    ...(unitId ? { unitId } : {}),
    ...(indId ? { indId } : {}),
    ...(activeOnly
      ? {
          fromDt: { lte: now },
          OR: [{ toDt: null }, { toDt: { gte: now } }],
        }
      : {}),
  };

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.unitResident.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        unit: true,
        individual: true,
      },
    }),
    db.unitResident.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function getResidencyById(id: string) {
  const residency = await db.unitResident.findUnique({
    where: { id },
    include: { unit: true, individual: true },
  });

  if (!residency) {
    throw new HttpError(404, "NOT_FOUND", "Residency record not found.");
  }

  return residency;
}

export async function createResidency(input: CreateResidencyInput) {
  return db.$transaction(
    async (tx) => {
      const unit = await ensureResidencyReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Residency start date");
      await ensureNoResidencyOverlap(tx, input.unitId, input.fromDt, input.toDt ?? null);

      return tx.unitResident.create({
        data: {
          unitId: input.unitId,
          indId: input.indId,
          fromDt: input.fromDt,
          toDt: input.toDt ?? null,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

export async function updateResidency(id: string, input: UpdateResidencyInput) {
  return db.$transaction(
    async (tx) => {
      const current = await tx.unitResident.findUnique({ where: { id } });
      if (!current) {
        throw new HttpError(404, "NOT_FOUND", "Residency record not found.");
      }

      const nextUnitId = input.unitId ?? current.unitId;
      const nextFromDt = input.fromDt ?? current.fromDt;
      const nextToDt = input.toDt === undefined ? current.toDt : input.toDt;

      if (nextToDt && nextFromDt.getTime() > nextToDt.getTime()) {
        throw new HttpError(400, "VALIDATION_ERROR", "fromDt must be before or equal to toDt.");
      }

      const unit = await ensureResidencyReferencesExist(tx, nextUnitId, input.indId ?? current.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, nextFromDt, "Residency start date");
      await ensureNoResidencyOverlap(tx, nextUnitId, nextFromDt, nextToDt, id);

      return tx.unitResident.update({
        where: { id },
        data: {
          unitId: input.unitId,
          indId: input.indId,
          fromDt: input.fromDt,
          toDt: input.toDt,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

export async function deleteResidency(id: string) {
  const current = await db.unitResident.findUnique({ where: { id }, select: { id: true } });
  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Residency record not found.");
  }

  throw new HttpError(412, "PRECONDITION_FAILED", "Residency history is immutable and cannot be deleted.");
}
