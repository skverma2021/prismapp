import { HttpError, requireString } from "@/src/lib/api-response";

export type CreateResidencyInput = {
  unitId: string;
  indId: string;
  fromDt: Date;
  toDt?: Date | null;
};

export type UpdateResidencyInput = {
  toDt?: Date | null;
};

function parseRequiredDate(value: unknown, field: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date.`);
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
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date or null.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date.`);
  }

  return parsed;
}

function ensureRangeValidity(fromDt: Date, toDt?: Date | null) {
  if (toDt && fromDt.getTime() > toDt.getTime()) {
    throw new HttpError(400, "VALIDATION_ERROR", "fromDt must be before or equal to toDt.");
  }
}

export function parseCreateResidencyInput(payload: unknown): CreateResidencyInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;
  const fromDt = parseRequiredDate(record.fromDt, "fromDt");
  const toDt = parseOptionalDate(record.toDt, "toDt");

  ensureRangeValidity(fromDt, toDt);

  return {
    unitId: requireString(record.unitId, "unitId"),
    indId: requireString(record.indId, "indId"),
    fromDt,
    toDt,
  };
}

export function parseUpdateResidencyInput(payload: unknown): UpdateResidencyInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  if (record.unitId !== undefined || record.indId !== undefined || record.fromDt !== undefined) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Only toDt can be edited on an existing residency record."
    );
  }

  const input: UpdateResidencyInput = {
    toDt: parseOptionalDate(record.toDt, "toDt"),
  };

  const hasAnyField = Object.values(input).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return input;
}
