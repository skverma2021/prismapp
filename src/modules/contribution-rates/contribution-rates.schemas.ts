import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";

export type CreateContributionRateInput = {
  contributionHeadId: number;
  reference?: string;
  fromDt: Date;
  toDt?: Date | null;
  amt: number;
};

function parseRequiredDate(value: unknown, field: string): Date {
  const raw = requireString(value, field);
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string.`);
  }

  return parsed;
}

function parseOptionalDate(value: unknown, field: string): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string or null.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string.`);
  }

  return parsed;
}

function parsePositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return value;
}

function parsePositiveAmount(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive number.`);
  }

  // Keep API contract deterministic: max 2 decimal places for persisted rate amount.
  const roundedToTwoDecimals = Math.round(value * 100) / 100;
  if (Math.abs(value - roundedToTwoDecimals) > Number.EPSILON) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} can have at most 2 decimal places.`);
  }

  return roundedToTwoDecimals;
}

export function parseCreateContributionRateInput(payload: unknown): CreateContributionRateInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const fromDt = parseRequiredDate(record.fromDt, "fromDt");
  const toDt = parseOptionalDate(record.toDt, "toDt");

  if (toDt && fromDt.getTime() > toDt.getTime()) {
    throw new HttpError(400, "VALIDATION_ERROR", "fromDt must be before or equal to toDt.");
  }

  return {
    contributionHeadId: parsePositiveInt(record.contributionHeadId, "contributionHeadId"),
    reference: parseOptionalString(record.reference),
    fromDt,
    toDt,
    amt: parsePositiveAmount(record.amt, "amt"),
  };
}
