import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";

export type CreateOwnershipInput = {
  unitId: string;
  indId: string;
  fromDt: Date;
  toDt?: Date | null;
};

export type UpdateOwnershipInput = {
  unitId?: string;
  indId?: string;
  fromDt?: Date;
  toDt?: Date | null;
};

export type TransferOwnershipInput = {
  unitId: string;
  indId: string;
  fromDt: Date;
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

export function parseCreateOwnershipInput(payload: unknown): CreateOwnershipInput {
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

export function parseUpdateOwnershipInput(payload: unknown): UpdateOwnershipInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const input: UpdateOwnershipInput = {
    unitId: parseOptionalString(record.unitId),
    indId: parseOptionalString(record.indId),
    fromDt: record.fromDt === undefined ? undefined : parseRequiredDate(record.fromDt, "fromDt"),
    toDt: parseOptionalDate(record.toDt, "toDt"),
  };

  const hasAnyField = Object.values(input).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  if (input.fromDt && input.toDt !== undefined) {
    ensureRangeValidity(input.fromDt, input.toDt);
  }

  return input;
}

export function parseTransferOwnershipInput(payload: unknown): TransferOwnershipInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    unitId: requireString(record.unitId, "unitId"),
    indId: requireString(record.indId, "indId"),
    fromDt: parseRequiredDate(record.fromDt, "fromDt"),
  };
}
