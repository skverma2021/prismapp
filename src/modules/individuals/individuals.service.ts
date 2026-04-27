import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import { maskIndividualPii } from "@/src/lib/pii-mask";
import type { AuthContext, UserRole } from "@/src/lib/user-role";
import type { CreateIndividualInput, UpdateIndividualInput } from "./individuals.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SYSTEM_IDENTITY_TAG_BUILDER = "BUILDER_INVENTORY";

export async function listIndividuals(searchParams: URLSearchParams, role: UserRole) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const q = searchParams.get("q")?.trim();
  const genderIdParam = searchParams.get("genderId");
  const sortBy = searchParams.get("sortBy") ?? "sName";
  const sortDir: "asc" | "desc" = searchParams.get("sortDir") === "desc" ? "desc" : "asc";

  if (!["fName", "sName", "eMail", "createdAt"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const genderId =
    genderIdParam === null
      ? undefined
      : (() => {
          const parsed = Number(genderIdParam);
          if (!Number.isInteger(parsed) || parsed < 0) {
            throw new HttpError(400, "VALIDATION_ERROR", "genderId must be a non-negative integer.");
          }

          return parsed;
        })();

  const where = {
    isSystemIdentity: false,
    ...(q
      ? {
          OR: [
            { fName: { contains: q, mode: "insensitive" as const } },
            { sName: { contains: q, mode: "insensitive" as const } },
            { eMail: { contains: q, mode: "insensitive" as const } },
            { mobile: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(genderId !== undefined ? { genderId } : {}),
  };

  const orderBy =
    sortBy === "sName"
      ? [{ sName: sortDir }, { fName: sortDir }]
      : sortBy === "fName"
        ? { fName: sortDir }
        : sortBy === "eMail"
          ? { eMail: sortDir }
          : { createdAt: sortDir };

  const [items, totalItems] = await db.$transaction([
    db.individual.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        genderType: true,
      },
    }),
    db.individual.count({ where }),
  ]);

  const totalPages = Math.ceil(totalItems / pageSize);

  return {
    items: items.map((item) => maskIndividualPii(item, role)),
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function listIndividualLookups() {
  return db.individual.findMany({
    where: {
      isSystemIdentity: false,
    },
    select: {
      id: true,
      fName: true,
      mName: true,
      sName: true,
    },
    orderBy: [{ sName: "asc" }, { fName: "asc" }, { mName: "asc" }],
  });
}

export async function getIndividualById(id: string, role: UserRole) {
  const individual = await db.individual.findUnique({
    where: { id },
    include: { genderType: true },
  });

  if (!individual) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  return maskIndividualPii(individual, role);
}

export async function createIndividual(input: CreateIndividualInput, actor: AuthContext) {
  const result = await db.individual.create({ data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "INDIVIDUAL_CREATED", entityType: "Individual", entityId: result.id, payload: { fName: input.fName, sName: input.sName } });
  return result;
}

export async function updateIndividual(id: string, input: UpdateIndividualInput, actor: AuthContext) {
  const current = await db.individual.findUnique({
    where: { id },
    select: { id: true, isSystemIdentity: true, systemTag: true, fName: true, mName: true, sName: true, eMail: true, mobile: true, genderId: true },
  });

  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  if (current.isSystemIdentity) {
    throw new HttpError(
      412,
      "PRECONDITION_FAILED",
      `${current.systemTag ?? "System"} identity cannot be edited through the normal individuals workflow.`
    );
  }

  const result = await db.individual.update({ where: { id }, data: input });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "INDIVIDUAL_UPDATED", entityType: "Individual", entityId: id, payload: { before: { fName: current.fName, mName: current.mName, sName: current.sName, eMail: current.eMail, mobile: current.mobile, genderId: current.genderId }, after: { fName: result.fName, mName: result.mName, sName: result.sName, eMail: result.eMail, mobile: result.mobile, genderId: result.genderId } } });
  return result;
}

export async function deleteIndividual(id: string, actor: AuthContext) {
  const current = await db.individual.findUnique({
    where: { id },
    select: { id: true, isSystemIdentity: true, systemTag: true },
  });

  if (!current) {
    throw new HttpError(404, "NOT_FOUND", "Individual not found.");
  }

  if (current.isSystemIdentity || current.systemTag === SYSTEM_IDENTITY_TAG_BUILDER) {
    throw new HttpError(
      412,
      "PRECONDITION_FAILED",
      "System identities cannot be deleted through the normal individuals workflow."
    );
  }

  await db.individual.delete({ where: { id } });
  await writeAuditLog(db, { actorUserId: actor.userId, actorRole: actor.role, action: "INDIVIDUAL_DELETED", entityType: "Individual", entityId: id });
}
