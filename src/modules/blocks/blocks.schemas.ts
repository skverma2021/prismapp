import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";

export type CreateBlockInput = {
  description: string;
};

export type UpdateBlockInput = {
  description?: string;
};

export function parseCreateBlockInput(payload: unknown): CreateBlockInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    description: requireString(record.description, "description"),
  };
}

export function parseUpdateBlockInput(payload: unknown): UpdateBlockInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;
  const description = parseOptionalString(record.description);

  if (description === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return { description };
}
