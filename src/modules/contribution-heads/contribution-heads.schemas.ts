import {
  HttpError,
  parseOptionalString,
  parsePositiveInt,
  requireString,
} from "@/src/lib/api-response";

export type CreateContributionHeadInput = {
  description: string;
  payUnit: number;
  period: "MONTH" | "YEAR";
};

export type UpdateContributionHeadInput = {
  description?: string;
  payUnit?: number;
  period?: "MONTH" | "YEAR";
};

function parsePeriod(value: unknown, field: string): "MONTH" | "YEAR" {
  const normalized = requireString(value, field).toUpperCase();

  if (normalized === "MONTH" || normalized === "YEAR") {
    return normalized;
  }

  throw new HttpError(400, "VALIDATION_ERROR", `${field} must be MONTH or YEAR.`);
}

export function parseCreateContributionHeadInput(payload: unknown): CreateContributionHeadInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    description: requireString(record.description, "description"),
    payUnit: parsePositiveInt(record.payUnit, "payUnit"),
    period: parsePeriod(record.period, "period"),
  };
}

export function parseUpdateContributionHeadInput(payload: unknown): UpdateContributionHeadInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const input: UpdateContributionHeadInput = {
    description: parseOptionalString(record.description),
    payUnit: record.payUnit === undefined ? undefined : parsePositiveInt(record.payUnit, "payUnit"),
    period: record.period === undefined ? undefined : parsePeriod(record.period, "period"),
  };

  const hasAnyField = Object.values(input).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return input;
}
