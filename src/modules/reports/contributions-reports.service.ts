import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

type TransactionsReportParams = {
  refYear: number;
  refMonth?: number;
  headId?: number;
  unitId?: string;
  blockId?: string;
  depositedBy?: string;
  transactionDateFrom?: Date;
  transactionDateTo?: Date;
  page: number;
  pageSize: number;
  sortBy: "transactionDateTime" | "createdAt" | "amount" | "id";
  sortDir: "asc" | "desc";
};

type MatrixReportParams = {
  refYear: number;
  headId: number;
  blockId?: string;
};

type MatrixMonthStatus = "Paid" | "Unpaid" | "N/A";

type MatrixStatusColumns = {
  jan: MatrixMonthStatus;
  feb: MatrixMonthStatus;
  mar: MatrixMonthStatus;
  apr: MatrixMonthStatus;
  may: MatrixMonthStatus;
  jun: MatrixMonthStatus;
  jul: MatrixMonthStatus;
  aug: MatrixMonthStatus;
  sep: MatrixMonthStatus;
  oct: MatrixMonthStatus;
  nov: MatrixMonthStatus;
  dec: MatrixMonthStatus;
};

type MatrixRow = MatrixStatusColumns & {
  unitId: string;
  unitDescription: string;
  blockId: string;
  blockDescription: string;
  ownerName: string | null;
  residentName: string | null;
  paidMonthsCount: number;
  unpaidMonthsCount: number;
};

function parseRequiredPositiveInt(value: string | null, field: string): number {
  if (value === null || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
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

export function parseTransactionsReportParams(searchParams: URLSearchParams): TransactionsReportParams {
  const refYear = parseRequiredPositiveInt(searchParams.get("refYear"), "refYear");
  const refMonth = parseOptionalPositiveInt(searchParams.get("refMonth"), "refMonth");
  const headId = parseOptionalPositiveInt(searchParams.get("headId"), "headId");
  const unitId = searchParams.get("unitId")?.trim() || undefined;
  const blockId = searchParams.get("blockId")?.trim() || undefined;
  const depositedBy = searchParams.get("depositedBy")?.trim() || undefined;
  const transactionDateFrom = parseOptionalDate(searchParams.get("transactionDateFrom"), "transactionDateFrom");
  const transactionDateTo = parseOptionalDate(searchParams.get("transactionDateTo"), "transactionDateTo");
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
  const sortBy = (searchParams.get("sortBy") ?? "transactionDateTime") as
    | "transactionDateTime"
    | "createdAt"
    | "amount"
    | "id";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  if (refMonth !== undefined && (refMonth < 0 || refMonth > 12)) {
    throw new HttpError(400, "VALIDATION_ERROR", "refMonth must be between 0 and 12.");
  }

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  if (!["transactionDateTime", "createdAt", "amount", "id"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  if (transactionDateFrom && transactionDateTo && transactionDateFrom > transactionDateTo) {
    throw new HttpError(400, "VALIDATION_ERROR", "transactionDateFrom must be before or equal to transactionDateTo.");
  }

  return {
    refYear,
    refMonth,
    headId,
    unitId,
    blockId,
    depositedBy,
    transactionDateFrom,
    transactionDateTo,
    page,
    pageSize,
    sortBy,
    sortDir,
  };
}

export function parseMatrixReportParams(searchParams: URLSearchParams): MatrixReportParams {
  const refYear = parseRequiredPositiveInt(searchParams.get("refYear"), "refYear");
  const headId = parseRequiredPositiveInt(searchParams.get("headId"), "headId");
  const blockId = searchParams.get("blockId")?.trim() || undefined;

  return { refYear, headId, blockId };
}

function periodLabel(refYear: number, refMonth: number): string {
  if (refMonth === 0) {
    return `${refYear}`;
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  return `${monthNames[refMonth - 1]} ${refYear}`;
}

function formatCsvValue(value: string | number): string {
  const text = String(value);
  if (text.includes(",") || text.includes("\n") || text.includes('"')) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function getContributionTransactionsReport(params: TransactionsReportParams) {
  const where = {
    contributionPeriod: {
      refYear: params.refYear,
      ...(params.refMonth !== undefined ? { refMonth: params.refMonth } : {}),
    },
    contribution: {
      ...(params.headId ? { contributionHeadId: params.headId } : {}),
      ...(params.unitId ? { unitId: params.unitId } : {}),
      ...(params.blockId ? { unit: { blockId: params.blockId } } : {}),
      ...(params.depositedBy ? { depositedBy: params.depositedBy } : {}),
      ...(params.transactionDateFrom || params.transactionDateTo
        ? {
            transactionDateTime: {
              ...(params.transactionDateFrom ? { gte: params.transactionDateFrom } : {}),
              ...(params.transactionDateTo ? { lte: params.transactionDateTo } : {}),
            },
          }
        : {}),
    },
  };

  const baseOrderBy =
    params.sortBy === "amount"
      ? [{ amt: params.sortDir }, { id: "desc" as const }]
      : params.sortBy === "id"
        ? [{ contributionId: params.sortDir }, { id: "desc" as const }]
        : [{ contribution: { [params.sortBy]: params.sortDir } }, { id: "desc" as const }];

  const [items, totalItems, totalAmountAggregate, unitRows, payerRows] = await db.$transaction([
    db.contributionDetail.findMany({
      where,
      include: {
        contributionPeriod: true,
        contribution: {
          include: {
            unit: { include: { block: true } },
            contributionHead: true,
            depositor: true,
          },
        },
      },
      orderBy: baseOrderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    db.contributionDetail.count({ where }),
    db.contributionDetail.aggregate({ where, _sum: { amt: true } }),
    db.contribution.findMany({
      where: {
        ...(params.headId ? { contributionHeadId: params.headId } : {}),
        ...(params.unitId ? { unitId: params.unitId } : {}),
        ...(params.blockId ? { unit: { blockId: params.blockId } } : {}),
        ...(params.depositedBy ? { depositedBy: params.depositedBy } : {}),
        ...(params.transactionDateFrom || params.transactionDateTo
          ? {
              transactionDateTime: {
                ...(params.transactionDateFrom ? { gte: params.transactionDateFrom } : {}),
                ...(params.transactionDateTo ? { lte: params.transactionDateTo } : {}),
              },
            }
          : {}),
        details: {
          some: {
            contributionPeriod: {
              refYear: params.refYear,
              ...(params.refMonth !== undefined ? { refMonth: params.refMonth } : {}),
            },
          },
        },
      },
      select: { unitId: true },
      distinct: ["unitId"],
    }),
    db.contribution.findMany({
      where: {
        ...(params.headId ? { contributionHeadId: params.headId } : {}),
        ...(params.unitId ? { unitId: params.unitId } : {}),
        ...(params.blockId ? { unit: { blockId: params.blockId } } : {}),
        ...(params.depositedBy ? { depositedBy: params.depositedBy } : {}),
        ...(params.transactionDateFrom || params.transactionDateTo
          ? {
              transactionDateTime: {
                ...(params.transactionDateFrom ? { gte: params.transactionDateFrom } : {}),
                ...(params.transactionDateTo ? { lte: params.transactionDateTo } : {}),
              },
            }
          : {}),
        details: {
          some: {
            contributionPeriod: {
              refYear: params.refYear,
              ...(params.refMonth !== undefined ? { refMonth: params.refMonth } : {}),
            },
          },
        },
      },
      select: { depositedBy: true },
      distinct: ["depositedBy"],
    }),
  ]);

  const totalPages = Math.ceil(totalItems / params.pageSize);

  const mappedItems = items.map((detail) => {
    const contributionWithReason = detail.contribution as typeof detail.contribution & {
      correctionReasonCode?: string | null;
      correctionReasonText?: string | null;
    };

    return {
      contributionId: detail.contributionId,
      transactionId: detail.contribution.transactionId,
      transactionDateTime: detail.contribution.transactionDateTime,
      block: detail.contribution.unit.block.description,
      blockId: detail.contribution.unit.blockId,
      unit: detail.contribution.unit.description,
      unitId: detail.contribution.unitId,
      head: detail.contribution.contributionHead.description,
      headId: detail.contribution.contributionHeadId,
      period: periodLabel(detail.contributionPeriod.refYear, detail.contributionPeriod.refMonth),
      refYear: detail.contributionPeriod.refYear,
      refMonth: detail.contributionPeriod.refMonth,
      quantity: detail.contribution.quantity,
      appliedRate: detail.appliedRate,
      amount: detail.amt,
      depositedBy: `${detail.contribution.depositor.fName} ${detail.contribution.depositor.sName}`,
      depositedById: detail.contribution.depositedBy,
      recordedBy: detail.contribution.actorUserId,
      recordedRole: detail.contribution.actorRole,
      recordedAt: detail.contribution.createdAt,
      correctionOfContributionId: detail.contribution.correctionOfContributionId,
      correctionReasonCode: contributionWithReason.correctionReasonCode ?? null,
      correctionReasonText: contributionWithReason.correctionReasonText ?? null,
    };
  });

  return {
    items: mappedItems,
    page: params.page,
    pageSize: params.pageSize,
    totalItems,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1,
    totals: {
      rowCount: totalItems,
      sumAmount: Number(totalAmountAggregate._sum.amt ?? 0),
      distinctUnitsCount: unitRows.length,
      distinctPayersCount: payerRows.length,
    },
  };
}

export async function getContributionTransactionsCsv(
  params: TransactionsReportParams,
  actorUserId: string
): Promise<string> {
  const data = await getContributionTransactionsReport({
    ...params,
    page: 1,
    pageSize: MAX_PAGE_SIZE,
    sortBy: "transactionDateTime",
    sortDir: "desc",
  });

  const generatedAt = new Date().toISOString();
  const filterEcho = {
    refYear: params.refYear,
    refMonth: params.refMonth ?? null,
    headId: params.headId ?? null,
    unitId: params.unitId ?? null,
    blockId: params.blockId ?? null,
    depositedBy: params.depositedBy ?? null,
    transactionDateFrom: params.transactionDateFrom?.toISOString() ?? null,
    transactionDateTo: params.transactionDateTo?.toISOString() ?? null,
  };

  const lines: string[] = [];
  lines.push(`generatedAt,${formatCsvValue(generatedAt)}`);
  lines.push(`generatedBy,${formatCsvValue(actorUserId)}`);
  lines.push(`filters,${formatCsvValue(JSON.stringify(filterEcho))}`);
  lines.push("");

  const header = [
    "contributionId",
    "transactionId",
    "transactionDateTime",
    "block",
    "unit",
    "head",
    "period",
    "quantity",
    "appliedRate",
    "amount",
    "depositedBy",
    "recordedBy",
    "recordedAt",
    "correctionOfContributionId",
    "correctionReasonCode",
    "correctionReasonText",
  ];
  lines.push(header.join(","));

  for (const item of data.items) {
    lines.push(
      [
        item.contributionId,
        item.transactionId,
        item.transactionDateTime.toISOString(),
        item.block,
        item.unit,
        item.head,
        item.period,
        item.quantity,
        item.appliedRate === null ? "" : Number(item.appliedRate),
        Number(item.amount),
        item.depositedBy,
        item.recordedBy ?? "",
        item.recordedAt.toISOString(),
        item.correctionOfContributionId ?? "",
        item.correctionReasonCode ?? "",
        item.correctionReasonText ?? "",
      ]
        .map((value) => formatCsvValue(value))
        .join(",")
    );
  }

  return lines.join("\n");
}

function monthKey(month: number): keyof MatrixStatusColumns {
  const keys: Array<keyof MatrixStatusColumns> = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  if (month < 1 || month > 12) {
    throw new HttpError(400, "VALIDATION_ERROR", "Month key must be between 1 and 12.");
  }

  return keys[month - 1];
}

async function deriveExpectedQuantityForUnit(unitId: string, payUnit: number, referenceDate: Date): Promise<number> {
  if (payUnit === 1) {
    const unit = await db.unit.findUnique({ where: { id: unitId }, select: { sqFt: true } });
    return unit?.sqFt ?? 0;
  }

  if (payUnit === 2) {
    return db.unitResident.count({
      where: {
        unitId,
        fromDt: { lte: referenceDate },
        OR: [{ toDt: null }, { toDt: { gte: referenceDate } }],
      },
    });
  }

  return 1;
}

export async function getPaidUnpaidMatrixReport(params: MatrixReportParams) {
  const head = await db.contributionHead.findUnique({
    where: { id: params.headId },
  });

  if (!head) {
    throw new HttpError(404, "NOT_FOUND", "Contribution head not found.");
  }

  const normalizedPeriod = head.period.trim().toUpperCase();
  if (normalizedPeriod !== "MONTH" && normalizedPeriod !== "YEAR") {
    throw new HttpError(400, "VALIDATION_ERROR", "Contribution head period must be MONTH or YEAR.");
  }

  const now = new Date();
  const activeRate = await db.contributionRate.findFirst({
    where: {
      contributionHeadId: params.headId,
      fromDt: { lte: now },
      OR: [{ toDt: null }, { toDt: { gte: now } }],
    },
    orderBy: [{ fromDt: "desc" }, { createdAt: "desc" }],
  });

  const rateValue = Number(activeRate?.amt ?? 0);

  const units = await db.unit.findMany({
    where: {
      ...(params.blockId ? { blockId: params.blockId } : {}),
    },
    include: {
      block: true,
    },
    orderBy: [{ block: { description: "asc" } }, { description: "asc" }],
  });

  const paidDetails = await db.contributionDetail.findMany({
    where: {
      contribution: {
        contributionHeadId: params.headId,
        unitId: {
          in: units.map((unit) => unit.id),
        },
      },
      contributionPeriod: {
        refYear: params.refYear,
      },
    },
    include: {
      contributionPeriod: true,
      contribution: {
        select: {
          unitId: true,
        },
      },
    },
  });

  const owners = await db.unitOwner.findMany({
    where: {
      unitId: { in: units.map((unit) => unit.id) },
      toDt: null,
    },
    include: {
      individual: true,
    },
  });

  const residents = await db.unitResident.findMany({
    where: {
      unitId: { in: units.map((unit) => unit.id) },
      toDt: null,
    },
    include: {
      individual: true,
    },
  });

  const ownerByUnit = new Map(owners.map((row) => [row.unitId, row.individual]));
  const residentByUnit = new Map(residents.map((row) => [row.unitId, row.individual]));

  const paidByUnitMonth = new Map<string, number>();
  for (const detail of paidDetails) {
    const key = `${detail.contribution.unitId}:${detail.contributionPeriod.refMonth}`;
    paidByUnitMonth.set(key, Number(detail.amt) + (paidByUnitMonth.get(key) ?? 0));
  }

  let totalPaidCells = 0;
  let totalUnpaidCells = 0;
  let collectionAmount = 0;
  let expectedAmount = 0;

  const rows: MatrixRow[] = [];

  for (const unit of units) {
    const owner = ownerByUnit.get(unit.id);
    const resident = residentByUnit.get(unit.id);
    const monthStatuses: MatrixStatusColumns = {
      jan: "N/A",
      feb: "N/A",
      mar: "N/A",
      apr: "N/A",
      may: "N/A",
      jun: "N/A",
      jul: "N/A",
      aug: "N/A",
      sep: "N/A",
      oct: "N/A",
      nov: "N/A",
      dec: "N/A",
    };

    const quantity = await deriveExpectedQuantityForUnit(unit.id, head.payUnit, now);
    const perPeriodExpected = roundTo2(quantity * rateValue);

    let paidMonthsCount = 0;
    let unpaidMonthsCount = 0;

    if (normalizedPeriod === "MONTH") {
      for (let month = 1; month <= 12; month += 1) {
        const key = `${unit.id}:${month}`;
        const paidAmount = paidByUnitMonth.get(key) ?? 0;

        collectionAmount += paidAmount;
        expectedAmount += perPeriodExpected;

        if (paidAmount > 0) {
          monthStatuses[monthKey(month)] = "Paid";
          paidMonthsCount += 1;
          totalPaidCells += 1;
        } else {
          monthStatuses[monthKey(month)] = "Unpaid";
          unpaidMonthsCount += 1;
          totalUnpaidCells += 1;
        }
      }
    } else {
      const key = `${unit.id}:0`;
      const paidAmount = paidByUnitMonth.get(key) ?? 0;

      collectionAmount += paidAmount;
      expectedAmount += perPeriodExpected;

      if (paidAmount > 0) {
        monthStatuses.jan = "Paid";
        paidMonthsCount = 1;
        totalPaidCells += 1;
      } else {
        monthStatuses.jan = "Unpaid";
        unpaidMonthsCount = 1;
        totalUnpaidCells += 1;
      }
    }

    rows.push({
      unitId: unit.id,
      unitDescription: unit.description,
      blockId: unit.blockId,
      blockDescription: unit.block.description,
      ownerName: owner ? `${owner.fName} ${owner.sName}` : null,
      residentName: resident ? `${resident.fName} ${resident.sName}` : null,
      ...monthStatuses,
      paidMonthsCount,
      unpaidMonthsCount,
    });
  }

  return {
    refYear: params.refYear,
    headId: params.headId,
    headDescription: head.description,
    periodType: normalizedPeriod,
    rows,
    totals: {
      totalUnits: rows.length,
      totalPaidCells,
      totalUnpaidCells,
      collectionAmount: roundTo2(collectionAmount),
      expectedAmount: roundTo2(expectedAmount),
      activeRate: rateValue,
    },
  };
}

export async function getPaidUnpaidMatrixCsv(
  params: MatrixReportParams,
  actorUserId: string
): Promise<string> {
  const data = await getPaidUnpaidMatrixReport(params);
  const generatedAt = new Date().toISOString();

  const filterEcho = {
    refYear: params.refYear,
    headId: params.headId,
    blockId: params.blockId ?? null,
  };

  const lines: string[] = [];
  lines.push(`generatedAt,${formatCsvValue(generatedAt)}`);
  lines.push(`generatedBy,${formatCsvValue(actorUserId)}`);
  lines.push(`filters,${formatCsvValue(JSON.stringify(filterEcho))}`);
  lines.push("");

  lines.push(
    [
      "unitId",
      "unitDescription",
      "blockId",
      "blockDescription",
      "ownerName",
      "residentName",
      "jan",
      "feb",
      "mar",
      "apr",
      "may",
      "jun",
      "jul",
      "aug",
      "sep",
      "oct",
      "nov",
      "dec",
      "paidMonthsCount",
      "unpaidMonthsCount",
    ].join(",")
  );

  for (const row of data.rows) {
    lines.push(
      [
        row.unitId,
        row.unitDescription,
        row.blockId,
        row.blockDescription,
        row.ownerName ?? "",
        row.residentName ?? "",
        row.jan,
        row.feb,
        row.mar,
        row.apr,
        row.may,
        row.jun,
        row.jul,
        row.aug,
        row.sep,
        row.oct,
        row.nov,
        row.dec,
        row.paidMonthsCount,
        row.unpaidMonthsCount,
      ]
        .map((value) => formatCsvValue(value))
        .join(",")
    );
  }

  lines.push("");
  lines.push(`totalUnits,${formatCsvValue(data.totals.totalUnits)}`);
  lines.push(`totalPaidCells,${formatCsvValue(data.totals.totalPaidCells)}`);
  lines.push(`totalUnpaidCells,${formatCsvValue(data.totals.totalUnpaidCells)}`);
  lines.push(`collectionAmount,${formatCsvValue(data.totals.collectionAmount)}`);
  lines.push(`expectedAmount,${formatCsvValue(data.totals.expectedAmount)}`);
  lines.push(`activeRate,${formatCsvValue(data.totals.activeRate)}`);

  return lines.join("\n");
}
