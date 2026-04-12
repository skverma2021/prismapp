import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { CreateUnitInput, UpdateUnitInput } from "./units.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 500;
const BUILDER_INVENTORY_TAG = "BUILDER_INVENTORY";

async function ensureBuilderInventoryIdentity(tx: Pick<typeof db, "genderType" | "individual">) {
  const existing = await tx.individual.findUnique({
    where: { systemTag: BUILDER_INVENTORY_TAG },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const defaultGender = await tx.genderType.findFirst({
    orderBy: { id: "asc" },
    select: { id: true },
  });

  if (!defaultGender) {
    throw new HttpError(412, "PRECONDITION_FAILED", "Gender types must exist before builder inventory can be created.");
  }

  return tx.individual.create({
    data: {
      fName: "Builder",
      mName: null,
      sName: "Inventory",
      eMail: "builder.inventory@prismapp.local",
      mobile: "0000000000",
      altMobile: null,
      genderId: defaultGender.id,
      isSystemIdentity: true,
      systemTag: BUILDER_INVENTORY_TAG,
    },
    select: { id: true },
  });
}

export async function listUnits(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const q = searchParams.get("q")?.trim();
  const blockId = searchParams.get("blockId")?.trim();
  const sortBy = searchParams.get("sortBy") ?? "description";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["description", "sqFt", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const where = {
    ...(q
      ? {
          description: {
            contains: q,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(blockId ? { blockId } : {}),
  };

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.unit.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        block: true,
      },
    }),
    db.unit.count({ where }),
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

export async function listUnitLookups() {
  return db.unit.findMany({
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
  });
}

export async function getUnitById(id: string) {
  const unit = await db.unit.findUnique({
    where: { id },
    include: { block: true },
  });

  if (!unit) {
    throw new HttpError(404, "NOT_FOUND", "Unit not found.");
  }

  return unit;
}

export async function createUnit(input: CreateUnitInput) {
  return db.$transaction(
    async (tx) => {
      const builder = await ensureBuilderInventoryIdentity(tx);
      const unit = await tx.unit.create({
        data: input,
        include: { block: true },
      });

      await tx.unitOwner.create({
        data: {
          unitId: unit.id,
          indId: builder.id,
          fromDt: input.inceptionDt,
          toDt: null,
        },
      });

      return unit;
    },
    { isolationLevel: "Serializable" }
  );
}

export async function updateUnit(id: string, input: UpdateUnitInput) {
  const current = await db.unit.findUnique({
    where: { id },
    select: {
      inceptionDt: true,
      sqFt: true,
    },
  });

  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Unit not found.");
  }

  if (input.inceptionDt !== undefined) {
    const ownerCount = await db.unitOwner.count({ where: { unitId: id } });

    if (ownerCount > 0 && current.inceptionDt.getTime() !== input.inceptionDt.getTime()) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        "Unit inception date is locked once ownership continuity exists for the unit."
      );
    }
  }

  if (input.sqFt !== undefined && current.sqFt !== input.sqFt) {
    const perSqFtContributionExists = await db.contribution.findFirst({
      where: {
        unitId: id,
        contributionHead: {
          payUnit: 1,
        },
      },
      select: {
        id: true,
      },
    });

    if (perSqFtContributionExists) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        "Unit area cannot be changed after per-sq-ft contributions have been recorded for the unit."
      );
    }
  }

  return db.unit.update({
    where: { id },
    data: input,
  });
}

export async function deleteUnit(id: string) {
  await db.$transaction(async (tx) => {
    const unit = await tx.unit.findUnique({ where: { id }, select: { id: true } });

    if (!unit) {
      throw new HttpError(404, "NOT_FOUND", "Unit not found.");
    }

    const [owners, residentCount, contributionCount] = await Promise.all([
      tx.unitOwner.findMany({
        where: { unitId: id },
        select: {
          id: true,
          individual: {
            select: {
              systemTag: true,
            },
          },
        },
      }),
      tx.unitResident.count({ where: { unitId: id } }),
      tx.contribution.count({ where: { unitId: id } }),
    ]);

    const hasOnlyBuilderBootstrap =
      owners.length === 1 && owners[0].individual.systemTag === BUILDER_INVENTORY_TAG && residentCount === 0 && contributionCount === 0;

    if (!hasOnlyBuilderBootstrap && (owners.length > 0 || residentCount > 0 || contributionCount > 0)) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        "Unit cannot be deleted after ownership, residency, or contribution history exists."
      );
    }

    if (hasOnlyBuilderBootstrap) {
      await tx.unitOwner.delete({ where: { id: owners[0].id } });
    }

    await tx.unit.delete({ where: { id } });
  });
}
