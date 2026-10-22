// Pure, side-effect-free helpers extracted from contributions.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import type { Prisma } from "@prisma/client";

import { HttpError } from "@/src/lib/api-response";

export const CORRECTION_TYPE = {
  FULL_REVERSAL: "FULL_REVERSAL",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type CorrectionType = (typeof CORRECTION_TYPE)[keyof typeof CORRECTION_TYPE];

// Rows that count as money actually paid: originals (null status) and POSTED
// corrections. PENDING and REJECTED corrections never release the duplicate
// lock and never reduce paid totals (ADR-001, "PENDING corrections" section).
export const EFFECTIVE_CONTRIBUTION_WHERE: Prisma.ContributionWhereInput = {
  OR: [{ correctionStatus: null }, { correctionStatus: "POSTED" }],
};

// Rows that reserve part of an original: effective rows plus PENDING
// corrections. Used to stop two concurrent corrections over-reversing.
export const ACTIVE_CONTRIBUTION_WHERE: Prisma.ContributionWhereInput = {
  OR: [{ correctionStatus: null }, { correctionStatus: { in: ["POSTED", "PENDING"] } }],
};

export type AdjustmentRequest = { contributionPeriodId: number; amount: number };
export type SignedPeriodAmount = { contributionPeriodId: number; amt: number };

// Validates adjustment requests against what is still correctable and returns
// the negative detail amounts to post. `amount` is the positive value to give back.
export function planAdjustmentRows(
  originalDetails: SignedPeriodAmount[],
  activeCorrectionDetails: SignedPeriodAmount[],
  requested: AdjustmentRequest[]
): SignedPeriodAmount[] {
  if (requested.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "adjustments must contain at least one period amount.");
  }

  const remaining = new Map<number, number>();
  for (const detail of [...originalDetails, ...activeCorrectionDetails]) {
    remaining.set(
      detail.contributionPeriodId,
      roundTo2((remaining.get(detail.contributionPeriodId) ?? 0) + detail.amt)
    );
  }

  const originalPeriodIds = new Set(originalDetails.map((detail) => detail.contributionPeriodId));

  return requested.map((entry) => {
    if (!originalPeriodIds.has(entry.contributionPeriodId)) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        `Period id ${entry.contributionPeriodId} is not part of the original contribution.`
      );
    }

    const available = remaining.get(entry.contributionPeriodId) ?? 0;
    if (roundTo2(entry.amount) > available) {
      throw new HttpError(
        412,
        "PRECONDITION_FAILED",
        `Adjustment ${entry.amount.toFixed(2)} for period id ${entry.contributionPeriodId} exceeds the remaining correctable amount ${available.toFixed(2)}.`
      );
    }

    return { contributionPeriodId: entry.contributionPeriodId, amt: -roundTo2(entry.amount) };
  });
}

export function parseContributionId(id: string): number {
  const parsed = Number(id);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid contribution id.");
  }

  return parsed;
}

export function parseOptionalPositiveInt(value: string | null, field: string): number | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return parsed;
}

export function parseOptionalDate(value: string | null, field: string): Date | undefined {
  if (value === null || value.trim().length === 0) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string.`);
  }

  return parsed;
}

export function normalizeHeadPeriod(period: string): "MONTH" | "YEAR" {
  const normalized = period.trim().toUpperCase();

  if (normalized === "MONTH" || normalized === "YEAR") {
    return normalized;
  }

  throw new HttpError(400, "VALIDATION_ERROR", "Contribution head period must be MONTH or YEAR.");
}

export function roundTo2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function monthLabel(month: number): string {
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (month < 1 || month > 12) {
    throw new HttpError(400, "VALIDATION_ERROR", "refMonth must be between 1 and 12.");
  }

  return labels[month - 1];
}

// ---------------------------------------------------------------------------
// checkRatePeriodCoverage
// ---------------------------------------------------------------------------
// Rate-period coverage check (Domain Rule C2 / Track-A 1.9).
// The applicable rate is resolved at transactionDateTime, not at the period
// start. This is accepted policy, but the operator should be informed when
// the rate's effective date is later than the earliest selected period start.
//
// Returns a warning string when a mismatch is detected; undefined otherwise.
export function checkRatePeriodCoverage(
  periods: Array<{ refYear: number; refMonth: number }>,
  rateFromDt: Date
): string | undefined {
  let earliestYear = periods[0].refYear;
  let earliestMonth = periods[0].refMonth;

  for (const p of periods) {
    if (
      p.refYear < earliestYear ||
      (p.refYear === earliestYear && p.refMonth < earliestMonth)
    ) {
      earliestYear = p.refYear;
      earliestMonth = p.refMonth;
    }
  }

  // refMonth = 0 means a whole-year period → start is Jan 1 of that year.
  // refMonth = 1-12 → start is 1st of that month. (JS months are 0-indexed.)
  const jsMonth = earliestMonth === 0 ? 0 : earliestMonth - 1;
  const earliestPeriodStart = new Date(Date.UTC(earliestYear, jsMonth, 1));

  if (rateFromDt <= earliestPeriodStart) {
    return undefined;
  }

  const rateFromLabel = rateFromDt.toISOString().slice(0, 10);
  const periodLabel =
    earliestMonth === 0
      ? String(earliestYear)
      : `${monthLabel(earliestMonth)} ${earliestYear}`;

  return (
    `The applied rate (effective from ${rateFromLabel}) started after the ` +
    `earliest selected period (${periodLabel}). ` +
    `Rate was resolved at transaction date per domain policy.`
  );
}
