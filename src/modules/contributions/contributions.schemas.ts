import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";
import { CORRECTION_TYPE, type AdjustmentRequest, type CorrectionType } from "./contributions.helpers";

export type CreateContributionInput = {
  unitId: string;
  contributionHeadId: number;
  contributionPeriodIds: number[];
  transactionId: string;
  transactionDateTime: Date;
  depositedBy: string;
  availingPersonCount?: number;
  comment?: string;
  reference?: string;
};

export type CreateContributionCorrectionInput = {
  originalContributionId: number;
  transactionId: string;
  transactionDateTime: Date;
  reasonCode: string;
  reasonText: string;
  depositedBy?: string;
  correctionType: CorrectionType;
  adjustments?: AdjustmentRequest[];
};

function parseAdjustments(value: unknown): AdjustmentRequest[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "adjustments must be a non-empty array for ADJUSTMENT corrections.");
  }

  const parsed = value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) {
      throw new HttpError(400, "VALIDATION_ERROR", `adjustments[${index}] must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const amount = record.amount;

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      throw new HttpError(400, "VALIDATION_ERROR", `adjustments[${index}].amount must be a positive number.`);
    }

    if (Math.round(amount * 100) !== Number((amount * 100).toFixed(6))) {
      throw new HttpError(400, "VALIDATION_ERROR", `adjustments[${index}].amount must have at most 2 decimal places.`);
    }

    return {
      contributionPeriodId: parsePositiveInt(record.contributionPeriodId, `adjustments[${index}].contributionPeriodId`),
      amount,
    };
  });

  if (new Set(parsed.map((entry) => entry.contributionPeriodId)).size !== parsed.length) {
    throw new HttpError(400, "VALIDATION_ERROR", "adjustments must not contain duplicate contributionPeriodId values.");
  }

  return parsed;
}

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
    availingPersonCount:
      record.availingPersonCount === undefined
        ? undefined
        : parsePositiveInt(record.availingPersonCount, "availingPersonCount"),
    comment: parseOptionalString(record.comment),
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

  const rawType = record.correctionType ?? CORRECTION_TYPE.FULL_REVERSAL;
  if (rawType !== CORRECTION_TYPE.FULL_REVERSAL && rawType !== CORRECTION_TYPE.ADJUSTMENT) {
    throw new HttpError(400, "VALIDATION_ERROR", "correctionType must be FULL_REVERSAL or ADJUSTMENT.");
  }

  if (rawType === CORRECTION_TYPE.FULL_REVERSAL && record.adjustments !== undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "adjustments is only allowed for ADJUSTMENT corrections.");
  }

  return {
    originalContributionId: parsePositiveInt(record.originalContributionId, "originalContributionId"),
    transactionId: requireString(record.transactionId, "transactionId"),
    transactionDateTime: parseRequiredDate(record.transactionDateTime, "transactionDateTime"),
    reasonCode: requireString(record.reasonCode, "reasonCode"),
    reasonText: requireString(record.reasonText, "reasonText"),
    depositedBy: parseOptionalString(record.depositedBy),
    correctionType: rawType,
    adjustments: rawType === CORRECTION_TYPE.ADJUSTMENT ? parseAdjustments(record.adjustments) : undefined,
  };
}
