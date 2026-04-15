import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseContributionPeriodId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid contribution period id.");
  }

  return parsed;
}

function parseOptionalInt(value: string | null, field: string): number | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an integer.`);
  }

  return parsed;
}

export async function listContributionPeriods(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const refYear = parseOptionalInt(searchParams.get("refYear"), "refYear");
  const refMonth = parseOptionalInt(searchParams.get("refMonth"), "refMonth");
  const sortBy = searchParams.get("sortBy") ?? "refYear";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  if (!["id", "refYear", "refMonth", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  if (refMonth !== undefined && (refMonth < 0 || refMonth > 12)) {
    throw new HttpError(400, "VALIDATION_ERROR", "refMonth must be between 0 and 12.");
  }

  const where = {
    ...(refYear !== undefined ? { refYear } : {}),
    ...(refMonth !== undefined ? { refMonth } : {}),
  };

  const [items, totalItems] = await db.$transaction([
    db.contributionPeriod.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.contributionPeriod.count({ where }),
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

export async function getContributionPeriodById(id: string) {
  const parsedId = parseContributionPeriodId(id);

  const period = await db.contributionPeriod.findUnique({
    where: { id: parsedId },
  });

  if (!period) {
    throw new HttpError(404, "NOT_FOUND", "Contribution period not found.");
  }

  return period;
}
