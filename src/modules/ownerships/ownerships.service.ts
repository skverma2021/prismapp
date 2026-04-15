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
const BUILDER_INVENTORY_TAG = "BUILDER_INVENTORY";

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}

function addDays(value: Date, days: number) {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
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

async function ensureOwnershipContinuity(
  tx: Pick<typeof db, "unitOwner">,
  unitId: string,
  inceptionDt: Date,
  candidate?: { id?: string; fromDt: Date; toDt: Date | null }
) {
  const existing = await tx.unitOwner.findMany({
    where: {
      unitId,
      ...(candidate?.id ? { id: { not: candidate.id } } : {}),
    },
    select: {
      id: true,
      fromDt: true,
      toDt: true,
    },
    orderBy: [{ fromDt: "asc" }, { createdAt: "asc" }],
  });

  const timeline = candidate
    ? [...existing, { id: candidate.id ?? "candidate", fromDt: candidate.fromDt, toDt: candidate.toDt }].sort(
        (left, right) => left.fromDt.getTime() - right.fromDt.getTime()
      )
    : existing;

  if (timeline.length === 0) {
    return;
  }

  if (timeline[0].fromDt.getTime() !== inceptionDt.getTime()) {
    throw new HttpError(
      409,
      "CONFLICT",
      `Ownership history must start on the unit inception date (${inceptionDt.toISOString().slice(0, 10)}).`
    );
  }

  for (let index = 0; index < timeline.length - 1; index += 1) {
    const current = timeline[index];
    const next = timeline[index + 1];

    if (current.toDt === null) {
      throw new HttpError(409, "CONFLICT", "Ownership history cannot contain a future row after an active owner.");
    }

    const expectedNextFrom = addDays(current.toDt, 1);
    if (next.fromDt.getTime() !== expectedNextFrom.getTime()) {
      throw new HttpError(409, "CONFLICT", "Ownership history must remain continuous with no gaps between owners.");
    }
  }
}

async function ensureOwnershipReferencesExist(
  tx: Pick<typeof db, "unit" | "individual">,
  unitId: string,
  indId: string
) {
  const [unit, individual] = await Promise.all([
    tx.unit.findUnique({ where: { id: unitId }, select: { id: true, inceptionDt: true } }),
    tx.individual.findUnique({ where: { id: indId }, select: { id: true, isSystemIdentity: true, systemTag: true } }),
  ]);

  if (!unit) {
    throw new HttpError(404, "NOT_FOUND", "Unit not found.");
  }

  if (!individual) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  if (individual.isSystemIdentity) {
    throw new HttpError(
      412,
      "PRECONDITION_FAILED",
      `${individual.systemTag ?? "System"} identity cannot be selected through the normal ownership workflow.`
    );
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
      where: {
        isSystemIdentity: false,
      },
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

export async function listResidencyEligibleUnitIds() {
  const now = new Date();

  const rows = await db.unitOwner.findMany({
    where: {
      fromDt: { lte: now },
      OR: [{ toDt: null }, { toDt: { gte: now } }],
      individual: {
        isSystemIdentity: false,
      },
    },
    select: {
      unitId: true,
    },
    distinct: ["unitId"],
  });

  return rows.map((row) => row.unitId);
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
      await ensureOwnershipContinuity(tx, input.unitId, unit.inceptionDt, {
        fromDt: input.fromDt,
        toDt: input.toDt ?? null,
      });

      return tx.unitOwner.create({
        data: {
          unitId: input.unitId,
          indId: input.indId,
          fromDt: input.fromDt,
          toDt: input.toDt ?? null,
        },
      });
    },
    { isolationLevel: "ReadCommitted" }
  );
}

export async function updateOwnership(id: string, input: UpdateOwnershipInput) {
  const current = await db.unitOwner.findUnique({ where: { id }, select: { id: true } });
  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Ownership record not found.");
  }

  void input;

  throw new HttpError(412, "PRECONDITION_FAILED", "Ownership history is immutable. Use transfer to change the active owner.");
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

      const transferAnchor = input.fromDt;

      const scheduledRows = await tx.unitOwner.findMany({
        where: {
          unitId: input.unitId,
          fromDt: { gte: transferAnchor },
        },
        select: {
          id: true,
          fromDt: true,
          indId: true,
          individual: {
            select: {
              isSystemIdentity: true,
              systemTag: true,
            },
          },
        },
        orderBy: [{ fromDt: "asc" }, { createdAt: "asc" }],
      });

      const futureNaturalOwners = scheduledRows.filter(
        (row) => !row.individual.isSystemIdentity && row.fromDt.getTime() >= transferAnchor.getTime()
      );

      if (futureNaturalOwners.length > 0) {
        throw new HttpError(
          412,
          "PRECONDITION_FAILED",
          `A future ownership row already exists from ${futureNaturalOwners[0].fromDt.toISOString().slice(0, 10)}. Remove or adjust that planned owner before transferring again.`
        );
      }

      const redundantBuilderRowIds = scheduledRows
        .filter(
          (row) =>
            row.individual.isSystemIdentity ||
            row.individual.systemTag === BUILDER_INVENTORY_TAG
        )
        .map((row) => row.id);

      if (redundantBuilderRowIds.length > 0) {
        await tx.unitOwner.deleteMany({
          where: {
            id: {
              in: redundantBuilderRowIds,
            },
          },
        });
      }

      const current = await tx.unitOwner.findFirst({
        where: {
          unitId: input.unitId,
          fromDt: { lte: transferAnchor },
          OR: [{ toDt: null }, { toDt: { gte: transferAnchor } }],
        },
        orderBy: { fromDt: "desc" },
      });

      if (!current) {
        throw new HttpError(412, "PRECONDITION_FAILED", "An active ownership is required before transfer.");
      }

      if (current.indId === input.indId) {
        throw new HttpError(400, "VALIDATION_ERROR", "Transfer owner must be different from active owner.");
      }

      const previousToDt = new Date(input.fromDt.getTime() - 24 * 60 * 60 * 1000);

      if (previousToDt.getTime() < current.fromDt.getTime()) {
        throw new HttpError(
          412,
          "PRECONDITION_FAILED",
          `Ownership transfer date must be after the current owner's start date (${current.fromDt.toISOString().slice(0, 10)}).`
        );
      }

      await tx.unitOwner.update({
        where: { id: current.id },
        data: { toDt: previousToDt },
      });

      await ensureOwnershipContinuity(tx, input.unitId, unit.inceptionDt, {
        fromDt: input.fromDt,
        toDt: null,
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
    { isolationLevel: "ReadCommitted" }
  );
}
