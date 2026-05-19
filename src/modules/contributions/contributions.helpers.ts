// Pure, side-effect-free helpers extracted from contributions.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import { HttpError } from "@/src/lib/api-response";

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
