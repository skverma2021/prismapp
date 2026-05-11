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
