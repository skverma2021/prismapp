import { HttpError, parseOptionalString, parsePositiveInt, requireString } from "@/src/lib/api-response";

export type CreateUnitInput = {
  description: string;
  blockId: string;
  sqFt: number;
  inceptionDt: Date;
};

export type UpdateUnitInput = {
  description?: string;
  blockId?: string;
  sqFt?: number;
  inceptionDt?: Date;
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

function parseOptionalDate(value: unknown, field: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date.`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid ISO date.`);
  }

  return parsed;
}

export function parseCreateUnitInput(payload: unknown): CreateUnitInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    description: requireString(record.description, "description"),
    blockId: requireString(record.blockId, "blockId"),
    sqFt: parsePositiveInt(record.sqFt, "sqFt"),
    inceptionDt: parseRequiredDate(record.inceptionDt, "inceptionDt"),
  };
}

export function parseUpdateUnitInput(payload: unknown): UpdateUnitInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const description = parseOptionalString(record.description);
  const blockId = parseOptionalString(record.blockId);
  const sqFt = record.sqFt === undefined ? undefined : parsePositiveInt(record.sqFt, "sqFt");
  const inceptionDt = parseOptionalDate(record.inceptionDt, "inceptionDt");

  if (description === undefined && blockId === undefined && sqFt === undefined && inceptionDt === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return {
    description,
    blockId,
    sqFt,
    inceptionDt,
  };
}
