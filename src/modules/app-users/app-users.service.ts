import bcrypt from "bcryptjs";

import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import type { AuthContext } from "@/src/lib/user-role";
import type { CreateAppUserInput, UpdateAppUserInput } from "./app-users.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const BCRYPT_ROUNDS = 12;

export async function listAppUsers(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const q = searchParams.get("q")?.trim();
  const role = searchParams.get("role")?.trim() || undefined;
  const sortBy = searchParams.get("sortBy") ?? "displayName";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["displayName", "email", "role", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (role) {
    where.role = role;
  }

  const [items, totalItems] = await db.$transaction([
    db.appUser.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    db.appUser.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items,
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function getAppUserById(id: string) {
  const user = await db.appUser.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new HttpError(404, "NOT_FOUND", "App user not found.");
  }

  return user;
}

export async function createAppUser(input: CreateAppUserInput, actor: AuthContext) {
  // Resolve individual — this enforces that every operator account is a registered person.
  const individual = await db.individual.findUnique({
    where: { id: input.individualId },
    select: { id: true, fName: true, mName: true, sName: true, eMail: true, isSystemIdentity: true },
  });

  if (!individual) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  if (individual.isSystemIdentity) {
    throw new HttpError(400, "VALIDATION_ERROR", "System identities cannot have app user accounts.");
  }

  const email = individual.eMail.toLowerCase();
  const nameParts = [individual.fName, individual.mName, individual.sName].filter(Boolean);
  const displayName = nameParts.join(" ");

  const existing = await db.appUser.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "CONFLICT", "An account already exists for this individual's email.");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const result = await db.appUser.create({
    data: {
      email,
      displayName,
      role: input.role,
      passwordHash,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "APP_USER_CREATED",
    entityType: "AppUser",
    entityId: result.id,
    payload: { email: result.email, displayName: result.displayName, role: result.role, individualId: input.individualId },
  });

  return result;
}

export async function updateAppUser(id: string, input: UpdateAppUserInput, actor: AuthContext) {
  const before = await db.appUser.findUnique({
    where: { id },
    select: { email: true, displayName: true, role: true, isActive: true },
  });

  if (!before) {
    throw new HttpError(404, "NOT_FOUND", "App user not found.");
  }

  const data: Record<string, unknown> = {};
  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.role !== undefined) data.role = input.role;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password !== undefined) {
    data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  }

  const result = await db.appUser.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "APP_USER_UPDATED",
    entityType: "AppUser",
    entityId: id,
    payload: {
      before: { displayName: before.displayName, role: before.role, isActive: before.isActive },
      after: { displayName: result.displayName, role: result.role, isActive: result.isActive },
      passwordChanged: input.password !== undefined,
    },
  });

  return result;
}
