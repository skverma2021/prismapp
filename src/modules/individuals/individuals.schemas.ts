import { HttpError, parseOptionalString, requireString } from "@/src/lib/api-response";

export type CreateIndividualInput = {
  fName: string;
  mName?: string;
  sName: string;
  eMail: string;
  mobile: string;
  altMobile?: string;
  genderId: number;
};

export type UpdateIndividualInput = {
  fName?: string;
  mName?: string;
  sName?: string;
  eMail?: string;
  mobile?: string;
  altMobile?: string;
  genderId?: number;
};

function parseGenderId(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new HttpError(400, "VALIDATION_ERROR", "genderId must be a non-negative integer.");
  }

  return value;
}

function parseEmail(value: unknown, field: string): string {
  const email = requireString(value, field).toLowerCase();

  if (!email.includes("@") || email.startsWith("@") || email.endsWith("@")) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid email address.`);
  }

  return email;
}

function parseMobile(value: unknown, field: string): string {
  const mobile = requireString(value, field);

  if (!/^[0-9+\-()\s]{6,20}$/.test(mobile)) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a valid contact number.`);
  }

  return mobile;
}

function parseOptionalMobile(value: unknown): string | undefined {
  const mobile = parseOptionalString(value);
  if (mobile === undefined) {
    return undefined;
  }

  if (!/^[0-9+\-()\s]{6,20}$/.test(mobile)) {
    throw new HttpError(400, "VALIDATION_ERROR", "altMobile must be a valid contact number.");
  }

  return mobile;
}

export function parseCreateIndividualInput(payload: unknown): CreateIndividualInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  return {
    fName: requireString(record.fName, "fName"),
    mName: parseOptionalString(record.mName),
    sName: requireString(record.sName, "sName"),
    eMail: parseEmail(record.eMail, "eMail"),
    mobile: parseMobile(record.mobile, "mobile"),
    altMobile: parseOptionalMobile(record.altMobile),
    genderId: parseGenderId(record.genderId),
  };
}

export function parseUpdateIndividualInput(payload: unknown): UpdateIndividualInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }

  const record = payload as Record<string, unknown>;

  const input: UpdateIndividualInput = {
    fName: parseOptionalString(record.fName),
    mName: parseOptionalString(record.mName),
    sName: parseOptionalString(record.sName),
    eMail: record.eMail === undefined ? undefined : parseEmail(record.eMail, "eMail"),
    mobile: record.mobile === undefined ? undefined : parseMobile(record.mobile, "mobile"),
    altMobile: parseOptionalMobile(record.altMobile),
    genderId: record.genderId === undefined ? undefined : parseGenderId(record.genderId),
  };

  const hasAnyField = Object.values(input).some((value) => value !== undefined);
  if (!hasAnyField) {
    throw new HttpError(400, "VALIDATION_ERROR", "At least one mutable field is required.");
  }

  return input;
}
