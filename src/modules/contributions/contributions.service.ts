import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import type { UserRole } from "@/src/lib/authz";
import type {
  CreateContributionCorrectionInput,
  CreateContributionInput,
} from "./contributions.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type ContributionActor = {
  actorUserId: string;
  actorRole: UserRole;
};

function parseContributionId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid contribution id.");
  }

  return parsed;
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

function normalizeHeadPeriod(period: string): "MONTH" | "YEAR" {
  const normalized = period.trim().toUpperCase();

  if (normalized === "MONTH" || normalized === "YEAR") {
    return normalized;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "Contribution head period must be MONTH or YEAR.");
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthLabel(month: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (month < 1 || month > 12) {
    throw new HttpError(400, "VALIDATION_ERROR", "refMonth must be between 1 and 12.");
  }

  return labels[month - 1];
}

async function deriveQuantity(
  tx: Pick<typeof db, "unit" | "unitResident">,
  payUnit: number,
  unitId: string,
  transactionDateTime: Date,
  availingPersonCount?: number
): Promise<number> {
  if (payUnit === 1) {
    const unit = await tx.unit.findUnique({ where: { id: unitId }, select: { sqFt: true } });
    if (!unit) {
      throw new HttpError(404, "NOT_FOUND", "Unit not found.");
    }

    return unit.sqFt;
  }

  if (payUnit === 2) {
    const residentCount = await tx.unitResident.count({
      where: {
        unitId,
        fromDt: { lte: transactionDateTime },
        OR: [{ toDt: null }, { toDt: { gte: transactionDateTime } }],
      },
    });

    if (residentCount <= 0) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        "Per-person contribution requires at least one active resident for the unit."
      );
    }

    if (availingPersonCount === undefined) {
      throw new HttpError(
        400,
        "VALIDATION_ERROR",
        "availingPersonCount is required for per-person contribution heads."
      );
    }

    return availingPersonCount;
  }

  if (payUnit === 3) {
    return 1;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "Unsupported payUnit on contribution head.");
}

async function validatePeriodRules(
  tx: Pick<typeof db, "contributionPeriod">,
  contributionPeriodIds: number[],
  headPeriod: "MONTH" | "YEAR"
) {
  const periods = await tx.contributionPeriod.findMany({
    where: {
      id: { in: contributionPeriodIds },
    },
  });

  if (periods.length !== contributionPeriodIds.length) {
    throw new HttpError(404, "NOT_FOUND", "One or more contribution periods were not found.");
  }

  const currentYear = new Date().getUTCFullYear();
  const invalidYear = periods.some((period) => period.refYear !== currentYear);
  if (invalidYear) {
    throw new HttpError(412, "PRECONDITION_FAILED", "Payments are allowed only for periods in current year.");
  }

  if (headPeriod === "MONTH") {
    const hasYearlyPeriod = periods.some((period) => period.refMonth === 0);
    if (hasYearlyPeriod) {
      throw new HttpError(412, "PRECONDITION_FAILED", "Monthly contribution cannot use yearly period (refMonth = 0).");
    }
  }

  if (headPeriod === "YEAR") {
    if (periods.length !== 1 || periods[0].refMonth !== 0) {
      throw new HttpError(412, "PRECONDITION_FAILED", "Yearly contribution must use exactly one yearly period.");
    }
  }

  return periods;
}

async function ensureNoDuplicateContribution(
  tx: Pick<typeof db, "contributionDetail">,
  unitId: string,
  contributionHeadId: number,
  contributionPeriodIds: number[]
) {
  const matchedDetails = await tx.contributionDetail.findMany({
    where: {
      contributionPeriodId: { in: contributionPeriodIds },
      contribution: {
        unitId,
        contributionHeadId,
      },
    },
    select: {
      contributionPeriodId: true,
      amt: true,
    },
  });

  const netByPeriod = new Map<number, number>();
  for (const detail of matchedDetails) {
    const current = netByPeriod.get(detail.contributionPeriodId) ?? 0;
    netByPeriod.set(detail.contributionPeriodId, roundTo2(current + Number(detail.amt)));
  }

  const lockedPeriodId = contributionPeriodIds.find((periodId) => (netByPeriod.get(periodId) ?? 0) > 0);
  if (lockedPeriodId) {
    throw new HttpError(
      409,
      "CONFLICT",
      `Duplicate contribution exists for period id ${lockedPeriodId}.`
    );
  }
}

export async function listContributions(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const unitId = searchParams.get("unitId")?.trim();
  const contributionHeadId = parseOptionalPositiveInt(searchParams.get("headId"), "headId");
  const refYear = parseOptionalPositiveInt(searchParams.get("refYear"), "refYear");
  const refMonth = parseOptionalPositiveInt(searchParams.get("refMonth"), "refMonth");
  const depositedBy = searchParams.get("depositedBy")?.trim();
  const transactionDateFrom = parseOptionalDate(
    searchParams.get("transactionDateFrom"),
    "transactionDateFrom"
  );
  const transactionDateTo = parseOptionalDate(searchParams.get("transactionDateTo"), "transactionDateTo");
  const sortBy = searchParams.get("sortBy") ?? "transactionDateTime";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  if (!["transactionDateTime", "createdAt", "id"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  if (refMonth !== undefined && (refMonth < 0 || refMonth > 12)) {
    throw new HttpError(400, "VALIDATION_ERROR", "refMonth must be between 0 and 12.");
  }

  if (transactionDateFrom && transactionDateTo && transactionDateFrom > transactionDateTo) {
    throw new HttpError(400, "VALIDATION_ERROR", "transactionDateFrom must be before or equal to transactionDateTo.");
  }

  const where = {
    ...(unitId ? { unitId } : {}),
    ...(contributionHeadId ? { contributionHeadId } : {}),
    ...(depositedBy ? { depositedBy } : {}),
    ...(transactionDateFrom || transactionDateTo
      ? {
          transactionDateTime: {
            ...(transactionDateFrom ? { gte: transactionDateFrom } : {}),
            ...(transactionDateTo ? { lte: transactionDateTo } : {}),
          },
        }
      : {}),
    ...((refYear !== undefined || refMonth !== undefined)
      ? {
          details: {
            some: {
              contributionPeriod: {
                ...(refYear !== undefined ? { refYear } : {}),
                ...(refMonth !== undefined ? { refMonth } : {}),
              },
            },
          },
        }
      : {}),
  };

  const [items, totalItems] = await db.$transaction([
    db.contribution.findMany({
      where,
      orderBy: [{ [sortBy]: sortDir }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        unit: true,
        contributionHead: true,
        depositor: true,
        details: {
          include: {
            contributionPeriod: true,
          },
          orderBy: [{ contributionPeriod: { refYear: "asc" } }, { contributionPeriod: { refMonth: "asc" } }],
        },
      },
    }),
    db.contribution.count({ where }),
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

export async function getContributionMonthLedger(searchParams: URLSearchParams) {
  const unitId = searchParams.get("unitId")?.trim();
  const contributionHeadId = parseOptionalPositiveInt(searchParams.get("headId"), "headId");
  const refYear = parseOptionalPositiveInt(searchParams.get("refYear"), "refYear");

  if (!unitId) {
    throw new HttpError(400, "VALIDATION_ERROR", "unitId is required.");
  }

  if (!contributionHeadId) {
    throw new HttpError(400, "VALIDATION_ERROR", "headId is required.");
  }

  if (!refYear) {
    throw new HttpError(400, "VALIDATION_ERROR", "refYear is required.");
  }

  const currentYear = new Date().getUTCFullYear();
  if (refYear !== currentYear) {
    throw new HttpError(412, "PRECONDITION_FAILED", "Only current-year periods are allowed.");
  }

  const head = await db.contributionHead.findUnique({
    where: { id: contributionHeadId },
    select: { id: true, description: true, period: true },
  });

  if (!head) {
    throw new HttpError(404, "NOT_FOUND", "Contribution head not found.");
  }

  const normalizedPeriod = normalizeHeadPeriod(head.period);
  if (normalizedPeriod !== "MONTH") {
    throw new HttpError(412, "PRECONDITION_FAILED", "Month ledger is only available for monthly contribution heads.");
  }

  const details = await db.contributionDetail.findMany({
    where: {
      contribution: {
        unitId,
        contributionHeadId,
      },
      contributionPeriod: {
        refYear,
        refMonth: {
          in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        },
      },
    },
    include: {
      contributionPeriod: {
        select: {
          refMonth: true,
          refYear: true,
        },
      },
      contribution: {
        select: {
          id: true,
          transactionId: true,
          transactionDateTime: true,
        },
      },
    },
    orderBy: [{ contributionPeriod: { refMonth: "asc" } }, { contribution: { transactionDateTime: "asc" } }],
  });

  const byMonth = new Map<number, {
    totalAmount: number;
    transactionRefs: Array<{ contributionId: number; transactionId: string; transactionDateTime: Date; amount: number }>;
  }>();

  for (const detail of details) {
    const month = detail.contributionPeriod.refMonth;
    const current = byMonth.get(month) ?? { totalAmount: 0, transactionRefs: [] };
    const amount = Number(detail.amt);
    current.totalAmount = roundTo2(current.totalAmount + amount);
    current.transactionRefs.push({
      contributionId: detail.contribution.id,
      transactionId: detail.contribution.transactionId,
      transactionDateTime: detail.contribution.transactionDateTime,
      amount,
    });
    byMonth.set(month, current);
  }

  const rows = Array.from({ length: 12 }, (_, index) => {
    const refMonth = index + 1;
    const aggregate = byMonth.get(refMonth);
    const totalAmount = roundTo2(aggregate?.totalAmount ?? 0);

    return {
      refYear,
      refMonth,
      monthLabel: monthLabel(refMonth),
      status: totalAmount > 0 ? "Paid" : "Unpaid",
      amount: totalAmount,
      transactionRefs: aggregate?.transactionRefs ?? [],
    };
  });

  const latestPaidMonth = rows.reduce<number | null>((latest, row) => {
    if (row.status !== "Paid") {
      return latest;
    }

    if (latest === null || row.refMonth > latest) {
      return row.refMonth;
    }

    return latest;
  }, null);

  return {
    unitId,
    headId: head.id,
    headDescription: head.description,
    refYear,
    latestPaidMonth,
    rows,
  };
}

export async function getContributionById(id: string) {
  const parsedId = parseContributionId(id);

  const contribution = await db.contribution.findUnique({
    where: { id: parsedId },
    include: {
      unit: true,
      contributionHead: true,
      depositor: true,
      details: {
        include: {
          contributionPeriod: true,
        },
        orderBy: [{ contributionPeriod: { refYear: "asc" } }, { contributionPeriod: { refMonth: "asc" } }],
      },
      correctionOf: true,
      correctedBy: {
        select: { id: true, createdAt: true, transactionId: true },
      },
    },
  });

  if (!contribution) {
    throw new HttpError(404, "NOT_FOUND", "Contribution not found.");
  }

  return contribution;
}

export async function createContribution(input: CreateContributionInput, actor: ContributionActor) {
  return db.$transaction(
    async (tx) => {
      const head = await tx.contributionHead.findUnique({
        where: { id: input.contributionHeadId },
      });

      if (!head) {
        throw new HttpError(404, "NOT_FOUND", "Contribution head not found.");
      }

      const depositor = await tx.individual.findUnique({
        where: { id: input.depositedBy },
        select: { id: true },
      });

      if (!depositor) {
        throw new HttpError(404, "NOT_FOUND", "Depositor individual not found.");
      }

      const normalizedPeriod = normalizeHeadPeriod(head.period);
      const periods = await validatePeriodRules(tx, input.contributionPeriodIds, normalizedPeriod);

      await ensureNoDuplicateContribution(tx, input.unitId, input.contributionHeadId, input.contributionPeriodIds);

      const quantity = await deriveQuantity(
        tx,
        head.payUnit,
        input.unitId,
        input.transactionDateTime,
        input.availingPersonCount
      );

      const applicableRate = await tx.contributionRate.findFirst({
        where: {
          contributionHeadId: input.contributionHeadId,
          fromDt: { lte: input.transactionDateTime },
          OR: [{ toDt: null }, { toDt: { gte: input.transactionDateTime } }],
        },
        orderBy: [{ fromDt: "desc" }, { createdAt: "desc" }],
      });

      if (!applicableRate) {
        throw new HttpError(412, "PRECONDITION_FAILED", "No active contribution rate found at transaction time.");
      }

      const rateValue = Number(applicableRate.amt);
      const detailAmount = roundTo2(rateValue * quantity);
      const totalPayableAmount = roundTo2(detailAmount * periods.length);

      if (detailAmount <= 0 || totalPayableAmount <= 0) {
        throw new HttpError(412, "PRECONDITION_FAILED", "Derived contribution amount must be positive.");
      }

      return tx.contribution.create({
        data: {
          unitId: input.unitId,
          contributionHeadId: input.contributionHeadId,
          quantity,
          periodCount: periods.length,
          transactionId: input.transactionId,
          transactionDateTime: input.transactionDateTime,
          depositedBy: input.depositedBy,
          inputComment: input.comment,
          actorUserId: actor.actorUserId,
          actorRole: actor.actorRole,
          details: {
            create: periods.map((period) => ({
              contributionPeriodId: period.id,
              contributionRateId: applicableRate.id,
              amt: detailAmount,
              appliedRate: rateValue,
              appliedRateReference: applicableRate.reference,
            })),
          },
        },
        include: {
          unit: true,
          contributionHead: true,
          depositor: true,
          details: {
            include: {
              contributionPeriod: true,
            },
            orderBy: [{ contributionPeriod: { refYear: "asc" } }, { contributionPeriod: { refMonth: "asc" } }],
          },
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

export async function createContributionCorrection(
  input: CreateContributionCorrectionInput,
  actor: ContributionActor
) {
  return db.$transaction(
    async (tx) => {
      const original = await tx.contribution.findUnique({
        where: { id: input.originalContributionId },
        include: {
          details: {
            include: {
              contributionPeriod: true,
            },
            orderBy: [{ contributionPeriod: { refYear: "asc" } }, { contributionPeriod: { refMonth: "asc" } }],
          },
        },
      });

      if (!original) {
        throw new HttpError(404, "NOT_FOUND", "Original contribution not found.");
      }

      if (original.correctionOfContributionId) {
        throw new HttpError(
          412,
          "PRECONDITION_FAILED",
          "Correction can only be created against an original posted contribution."
        );
      }

      if (original.details.length === 0) {
        throw new HttpError(412, "PRECONDITION_FAILED", "Original contribution has no detail rows to reverse.");
      }

      const depositorId = input.depositedBy ?? original.depositedBy;
      const depositor = await tx.individual.findUnique({
        where: { id: depositorId },
        select: { id: true },
      });

      if (!depositor) {
        throw new HttpError(404, "NOT_FOUND", "Depositor individual not found.");
      }

      return tx.contribution.create({
        data: {
          unitId: original.unitId,
          contributionHeadId: original.contributionHeadId,
          quantity: original.quantity,
          periodCount: original.periodCount,
          transactionId: input.transactionId,
          transactionDateTime: input.transactionDateTime,
          depositedBy: depositorId,
          actorUserId: actor.actorUserId,
          actorRole: actor.actorRole,
          correctionOfContributionId: original.id,
          correctionReasonCode: input.reasonCode,
          correctionReasonText: input.reasonText,
          details: {
            create: original.details.map((detail) => ({
              contributionPeriodId: detail.contributionPeriodId,
              contributionRateId: detail.contributionRateId,
              amt: -Number(detail.amt),
              appliedRate: detail.appliedRate ? Number(detail.appliedRate) : null,
              appliedRateReference: detail.appliedRateReference,
            })),
          },
        },
        include: {
          unit: true,
          contributionHead: true,
          depositor: true,
          correctionOf: true,
          details: {
            include: {
              contributionPeriod: true,
            },
            orderBy: [{ contributionPeriod: { refYear: "asc" } }, { contributionPeriod: { refMonth: "asc" } }],
          },
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}
