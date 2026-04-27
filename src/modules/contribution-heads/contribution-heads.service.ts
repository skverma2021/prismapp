import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import type { AuthContext } from "@/src/lib/user-role";
import type {
  CreateContributionHeadInput,
  UpdateContributionHeadInput,
} from "./contribution-heads.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseContributionHeadId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid contribution head id.");
  }

  return parsed;
}

function parsePeriodFilter(value: string | null): "MONTH" | "YEAR" | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const normalized = value.toUpperCase();
  if (normalized === "MONTH" || normalized === "YEAR") {
    return normalized;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "period must be MONTH or YEAR.");
}

function parseOptionalPositiveInt(value: string | null, field: string): number | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return parsed;
}

export async function listContributionHeads(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const q = searchParams.get("q")?.trim();
  const period = parsePeriodFilter(searchParams.get("period"));
  const payUnit = parseOptionalPositiveInt(searchParams.get("payUnit"), "payUnit");
  const sortBy = searchParams.get("sortBy") ?? "description";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["description", "payUnit", "period", "createdAt"].includes(sortBy)) {
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
    ...(period ? { period } : {}),
    ...(payUnit ? { payUnit } : {}),
  };

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.contributionHead.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            rates: true,
            contributions: true,
          },
        },
      },
    }),
    db.contributionHead.count({ where }),
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

export async function listContributionHeadLookups() {
  return db.contributionHead.findMany({
    select: {
      id: true,
      description: true,
      payUnit: true,
      period: true,
    },
    orderBy: {
      description: "asc",
    },
  });
}

export async function getContributionHeadById(id: string) {
  const parsedId = parseContributionHeadId(id);

  const head = await db.contributionHead.findUnique({
    where: { id: parsedId },
    include: {
      rates: {
        orderBy: [{ fromDt: "desc" }, { createdAt: "desc" }],
      },
      _count: {
        select: {
          contributions: true,
        },
      },
    },
  });

  if (!head) {
    throw new HttpError(404, "NOT_FOUND", "Contribution head not found.");
  }

  return head;
}

export async function createContributionHead(input: CreateContributionHeadInput, actor: AuthContext) {
  const result = await db.contributionHead.create({ data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "CONTRIBUTION_HEAD_CREATED", entityType: "ContributionHead", entityId: String(result.id), payload: { description: input.description, period: input.period, payUnit: input.payUnit } });
  return result;
}

export async function updateContributionHead(id: string, input: UpdateContributionHeadInput, actor: AuthContext) {
  const parsedId = parseContributionHeadId(id);
  const before = await db.contributionHead.findUnique({ where: { id: parsedId }, select: { description: true } });
  const result = await db.contributionHead.update({ where: { id: parsedId }, data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "CONTRIBUTION_HEAD_UPDATED", entityType: "ContributionHead", entityId: id, payload: { before: { description: before?.description }, after: { description: result.description } } });
  return result;
}

export async function deleteContributionHead(id: string, actor: AuthContext) {
  const parsedId = parseContributionHeadId(id);
  await db.contributionHead.delete({ where: { id: parsedId } });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "CONTRIBUTION_HEAD_DELETED", entityType: "ContributionHead", entityId: id });
}
