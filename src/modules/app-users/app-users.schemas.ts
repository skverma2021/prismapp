import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";
import { parseUserRole } from "@/src/lib/user-role";

export type CreateAppUserInput = {
  individualId: string;
  password: string;
  role: string;
};

export type UpdateAppUserInput = {
  role?: string;
  isActive?: boolean;
  password?: string;
};

export function parseCreateAppUserInput(payload: unknown): CreateAppUserInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const individualId = requireString(record.individualId, "individualId");
  const password = requireString(record.password, "password");
  const roleRaw = requireString(record.role, "role");

  if (password.length < 10) {
    throw new HttpError(400, "VALIDATION_ERROR", "password must be at least 10 characters.");
  }

  if (!parseUserRole(roleRaw)) {
    throw new HttpError(400, "VALIDATION_ERROR", "role must be SOCIETY_ADMIN, MANAGER, or READ_ONLY.");
  }

  return { individualId, password, role: roleRaw };
}

export function parseUpdateAppUserInput(payload: unknown): UpdateAppUserInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const roleRaw = parseOptionalString(record.role);
  const password = parseOptionalString(record.password);

  const isActiveRaw = record.isActive;
  let isActive: boolean | undefined;
  if (isActiveRaw !== undefined) {
    if (typeof isActiveRaw !== "boolean") {
      throw new HttpError(400, "VALIDATION_ERROR", "isActive must be a boolean.");
    }
    isActive = isActiveRaw;
  }

  if (roleRaw !== undefined && !parseUserRole(roleRaw)) {
    throw new HttpError(400, "VALIDATION_ERROR", "role must be SOCIETY_ADMIN, MANAGER, or READ_ONLY.");
  }

  if (password !== undefined && password.length < 10) {
    throw new HttpError(400, "VALIDATION_ERROR", "password must be at least 10 characters.");
  }

  if (roleRaw === undefined && isActive === undefined && password === undefined) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return { role: roleRaw, isActive, password };
}
