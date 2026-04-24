import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import type { AuthContext } from "@/src/lib/user-role";
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

export async function createBlock(input: CreateBlockInput, actor: AuthContext) {
  const result = await db.block.create({ data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "BLOCK_CREATED", entityType: "Block", entityId: result.id, payload: { description: input.description } });
  return result;
}

export async function updateBlock(id: string, input: UpdateBlockInput, actor: AuthContext) {
  const result = await db.block.update({ where: { id }, data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "BLOCK_UPDATED", entityType: "Block", entityId: id, payload: { ...(input.description !== undefined ? { description: input.description } : {}) } });
  return result;
}

export async function deleteBlock(id: string, actor: AuthContext) {
  await db.block.delete({ where: { id } });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "BLOCK_DELETED", entityType: "Block", entityId: id });
}
