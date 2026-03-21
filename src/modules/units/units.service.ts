import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { CreateUnitInput, UpdateUnitInput } from "./units.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

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
  return db.unit.create({
    data: input,
  });
}

export async function updateUnit(id: string, input: UpdateUnitInput) {
  return db.unit.update({
    where: { id },
    data: input,
  });
}

export async function deleteUnit(id: string) {
  await db.unit.delete({ where: { id } });
}
