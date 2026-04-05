import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type {
  CreateOwnershipInput,
  TransferOwnershipInput,
  UpdateOwnershipInput,
} from "./ownerships.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}

async function ensureNoOwnershipOverlap(
  tx: Pick<typeof db, "unitOwner">,
  unitId: string,
  fromDt: Date,
  toDt: Date | null,
  excludeId?: string
) {
  const existing = await tx.unitOwner.findMany({
    where: {
      unitId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const hasOverlap = existing.some((row) => rangesOverlap(fromDt, toDt, row.fromDt, row.toDt));
  if (hasOverlap) {
    throw new HttpError(409, "CONFLICT", "Ownership period overlaps with an existing ownership for this unit.");
  }
}

async function ensureOwnershipReferencesExist(
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

export async function listOwnerships(searchParams: URLSearchParams) {
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

  const where = {
    ...(unitId ? { unitId } : {}),
    ...(indId ? { indId } : {}),
    ...(activeOnly ? { toDt: null } : {}),
  };

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.unitOwner.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        unit: true,
        individual: true,
      },
    }),
    db.unitOwner.count({ where }),
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

export async function listOwnershipLookups() {
  const [units, individuals] = await Promise.all([
    db.unit.findMany({
      select: {
        id: true,
        description: true,
        blockId: true,
        block: {
          select: {
            description: true,
          },
        },
      },
    }),
    db.individual.findMany({
      select: {
        id: true,
        fName: true,
        mName: true,
        sName: true,
      },
      orderBy: [{ sName: "asc" }, { fName: "asc" }, { mName: "asc" }],
    }),
  ]);

  return {
    units,
    individuals,
  };
}

export async function getOwnershipById(id: string) {
  const ownership = await db.unitOwner.findUnique({
    where: { id },
    include: { unit: true, individual: true },
  });

  if (!ownership) {
    throw new HttpError(404, "NOT_FOUND", "Ownership record not found.");
  }

  return ownership;
}

export async function createOwnership(input: CreateOwnershipInput) {
  return db.$transaction(
    async (tx) => {
      const unit = await ensureOwnershipReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Ownership start date");
      await ensureNoOwnershipOverlap(tx, input.unitId, input.fromDt, input.toDt ?? null);
      return tx.unitOwner.create({
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

export async function updateOwnership(id: string, input: UpdateOwnershipInput) {
  return db.$transaction(
    async (tx) => {
      const current = await tx.unitOwner.findUnique({ where: { id } });
      if (!current) {
        throw new HttpError(404, "NOT_FOUND", "Ownership record not found.");
      }

      const nextUnitId = input.unitId ?? current.unitId;
      const nextIndId = input.indId ?? current.indId;
      const nextFromDt = input.fromDt ?? current.fromDt;
      const nextToDt = input.toDt === undefined ? current.toDt : input.toDt;

      if (nextToDt && nextFromDt.getTime() > nextToDt.getTime()) {
        throw new HttpError(400, "VALIDATION_ERROR", "fromDt must be before or equal to toDt.");
      }

      const unit = await ensureOwnershipReferencesExist(tx, nextUnitId, nextIndId);
      ensureNotBeforeUnitInception(unit.inceptionDt, nextFromDt, "Ownership start date");
      await ensureNoOwnershipOverlap(tx, nextUnitId, nextFromDt, nextToDt, id);

      return tx.unitOwner.update({
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

export async function deleteOwnership(id: string) {
  const current = await db.unitOwner.findUnique({ where: { id }, select: { id: true } });
  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Ownership record not found.");
  }

  throw new HttpError(412, "PRECONDITION_FAILED", "Ownership history is immutable and cannot be deleted.");
}

export async function transferOwnership(input: TransferOwnershipInput) {
  return db.$transaction(
    async (tx) => {
      const unit = await ensureOwnershipReferencesExist(tx, input.unitId, input.indId);
      ensureNotBeforeUnitInception(unit.inceptionDt, input.fromDt, "Ownership transfer date");

      const current = await tx.unitOwner.findFirst({
        where: {
          unitId: input.unitId,
          toDt: null,
        },
      });

      if (!current) {
        throw new HttpError(412, "PRECONDITION_FAILED", "An active ownership is required before transfer.");
      }

      if (current.indId === input.indId) {
        throw new HttpError(400, "VALIDATION_ERROR", "Transfer owner must be different from active owner.");
      }

      const previousToDt = new Date(input.fromDt.getTime() - 24 * 60 * 60 * 1000);

      await tx.unitOwner.update({
        where: { id: current.id },
        data: { toDt: previousToDt },
      });

      const created = await tx.unitOwner.create({
        data: {
          unitId: input.unitId,
          indId: input.indId,
          fromDt: input.fromDt,
          toDt: null,
        },
      });

      return created;
    },
    { isolationLevel: "Serializable" }
  );
}
