import { HttpError, parseOptionalString, parsePositiveInt, requireString } from "@/src/lib/api-response";

export type CreateUnitInput = {
  description: string;
  blockId: string;
  sqFt: number;
};

export type UpdateUnitInput = {
  description?: string;
  blockId?: string;
  sqFt?: number;
};

export function parseCreateUnitInput(payload: unknown): CreateUnitInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    description: requireString(record.description, "description"),
    blockId: requireString(record.blockId, "blockId"),
    sqFt: parsePositiveInt(record.sqFt, "sqFt"),
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

  if (description === undefined && blockId === undefined && sqFt === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return {
    description,
    blockId,
    sqFt,
  };
}
