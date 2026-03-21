import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { CreateBlockInput, UpdateBlockInput } from "./blocks.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function listBlocks(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const q = searchParams.get("q")?.trim();
  const sortBy = searchParams.get("sortBy") ?? "description";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["description", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const where = q
    ? {
        description: {
          contains: q,
          mode: "insensitive" as const,
        },
      }
    : {};

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.block.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.block.count({ where }),
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

export async function getBlockById(id: string) {
  const block = await db.block.findUnique({ where: { id } });
  if (!block) {
    throw new HttpError(404, "NOT_FOUND", "Block not found.");
  }

  return block;
}

export async function createBlock(input: CreateBlockInput) {
  return db.block.create({ data: input });
}

export async function updateBlock(id: string, input: UpdateBlockInput) {
  return db.block.update({
    where: { id },
    data: input,
  });
}

export async function deleteBlock(id: string) {
  await db.block.delete({ where: { id } });
}
