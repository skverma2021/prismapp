import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";

export type CreateContributionInput = {
  unitId: string;
  contributionHeadId: number;
  contributionPeriodIds: number[];
  transactionId: string;
  transactionDateTime: Date;
  depositedBy: string;
  reference?: string;
};

export type CreateContributionCorrectionInput = {
  originalContributionId: number;
  transactionId: string;
  transactionDateTime: Date;
  reasonCode: string;
  reasonText: string;
  depositedBy?: string;
};

function parsePositiveInt(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a positive integer.`);
  }

  return value;
}

function parseRequiredDate(value: unknown, field: string): Date {
  const raw = requireString(value, field);
  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date string.`);
  }

  return parsed;
}

function parseContributionPeriodIds(value: unknown): number[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "contributionPeriodIds must be a non-empty array.");
  }

  const parsed = value.map((entry, index) => parsePositiveInt(entry, `contributionPeriodIds[${index}]`));
  const unique = [...new Set(parsed)];

  if (unique.length !== parsed.length) {
    throw new HttpError(400, "VALIDATION_ERROR", "contributionPeriodIds must not contain duplicates.");
  }

  return unique;
}

export function parseCreateContributionInput(payload: unknown): CreateContributionInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    unitId: requireString(record.unitId, "unitId"),
    contributionHeadId: parsePositiveInt(record.contributionHeadId, "contributionHeadId"),
    contributionPeriodIds: parseContributionPeriodIds(record.contributionPeriodIds),
    transactionId: requireString(record.transactionId, "transactionId"),
    transactionDateTime: parseRequiredDate(record.transactionDateTime, "transactionDateTime"),
    depositedBy: requireString(record.depositedBy, "depositedBy"),
    reference: parseOptionalString(record.reference),
  };
}

export function parseCreateContributionCorrectionInput(
  payload: unknown
): CreateContributionCorrectionInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    originalContributionId: parsePositiveInt(record.originalContributionId, "originalContributionId"),
    transactionId: requireString(record.transactionId, "transactionId"),
    transactionDateTime: parseRequiredDate(record.transactionDateTime, "transactionDateTime"),
    reasonCode: requireString(record.reasonCode, "reasonCode"),
    reasonText: requireString(record.reasonText, "reasonText"),
    depositedBy: parseOptionalString(record.depositedBy),
  };
}
