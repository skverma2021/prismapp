import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { CreateContributionRateInput } from "./contribution-rates.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

function parseContributionRateId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid contribution rate id.");
  }

  return parsed;
}

function rangesOverlap(aStart: Date, aEnd: Date | null, bStart: Date, bEnd: Date | null): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}

async function ensureNoRateOverlap(
  tx: Pick<typeof db, "contributionRate">,
  contributionHeadId: number,
  fromDt: Date,
  toDt: Date | null,
  excludeId?: number
) {
  const existing = await tx.contributionRate.findMany({
    where: {
      contributionHeadId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });

  const hasOverlap = existing.some((row) => rangesOverlap(fromDt, toDt, row.fromDt, row.toDt));
  if (hasOverlap) {
    throw new HttpError(409, "CONFLICT", "Contribution rate period overlaps with existing rate history.");
  }
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

function parseOptionalDate(value: string | null, field: string): Date | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string.`);
  }

  return parsed;
}

export async function listContributionRates(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const contributionHeadId = parseOptionalPositiveInt(
    searchParams.get("contributionHeadId"),
    "contributionHeadId"
  );
  const activeOn = parseOptionalDate(searchParams.get("activeOn"), "activeOn");
  const sortBy = searchParams.get("sortBy") ?? "fromDt";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["fromDt", "toDt", "amt", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const where = {
    ...(contributionHeadId ? { contributionHeadId } : {}),
    ...(activeOn
      ? {
          fromDt: { lte: activeOn },
          OR: [{ toDt: null }, { toDt: { gte: activeOn } }],
        }
      : {}),
  };

  const orderBy = [{ contributionHeadId: "asc" as const }, { [sortBy]: sortDir }];

  const [items, totalItems] = await db.$transaction([
    db.contributionRate.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contributionHead: true,
      },
    }),
    db.contributionRate.count({ where }),
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

export async function getContributionRateById(id: string) {
  const parsedId = parseContributionRateId(id);

  const rate = await db.contributionRate.findUnique({
    where: { id: parsedId },
    include: {
      contributionHead: true,
    },
  });

  if (!rate) {
    throw new HttpError(404, "NOT_FOUND", "Contribution rate not found.");
  }

  return rate;
}

export async function createContributionRate(input: CreateContributionRateInput) {
  return db.$transaction(
    async (tx) => {
      const head = await tx.contributionHead.findUnique({
        where: { id: input.contributionHeadId },
        select: { id: true },
      });

      if (!head) {
        throw new HttpError(404, "NOT_FOUND", "Contribution head not found.");
      }

      await ensureNoRateOverlap(tx, input.contributionHeadId, input.fromDt, input.toDt ?? null);

      return tx.contributionRate.create({
        data: {
          contributionHeadId: input.contributionHeadId,
          reference: input.reference,
          fromDt: input.fromDt,
          toDt: input.toDt ?? null,
          amt: input.amt,
        },
        include: {
          contributionHead: true,
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}
