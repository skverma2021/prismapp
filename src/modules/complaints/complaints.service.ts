import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import type { AuthContext } from "@/src/lib/user-role";
import type { CreateComplaintInput, CreateComplaintNoteInput } from "./complaints.schemas";
import { COMPLAINT_STATUSES } from "./complaints.schemas";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// ticketId generation — MSH-{year}-{zero-padded-5-digit-seq} (CM6, CM7)
// Uses max(ticketId) within the year as the sequence source.
// Safe for V1 low-volume usage; replace with a DB sequence in a future sprint.
// ---------------------------------------------------------------------------

async function generateTicketId(): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `MSH-${year}-`;

  const last = await db.complaint.findFirst({
    where: { ticketId: { startsWith: prefix } },
    orderBy: { ticketId: "desc" },
    select: { ticketId: true },
  });

  let nextSeq = 1;
  if (last) {
    const seqPart = last.ticketId.slice(prefix.length);
    const parsed = Number(seqPart);
    if (!Number.isNaN(parsed)) {
      nextSeq = parsed + 1;
    }
  }

  return `${prefix}${String(nextSeq).padStart(5, "0")}`;
}

// ---------------------------------------------------------------------------
// List complaints (paginated, filterable)
// ---------------------------------------------------------------------------

export async function listComplaints(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
  if (pageSize > MAX_PAGE_SIZE) {
    throw new HttpError(400, "VALIDATION_ERROR", `pageSize cannot exceed ${MAX_PAGE_SIZE}.`);
  }

  const status = searchParams.get("status");
  if (status && !(COMPLAINT_STATUSES as readonly string[]).includes(status)) {
    throw new HttpError(400, "VALIDATION_ERROR", `Invalid status filter.`);
  }

  const unitId = searchParams.get("unitId") ?? undefined;
  const categoryId = searchParams.get("categoryId");
  const priorityId = searchParams.get("priorityId");
  const sortBy = searchParams.get("sortBy") ?? "createdAt";
  const sortDir = searchParams.get("sortDir") === "asc" ? "asc" : "desc";

  if (!["createdAt", "status", "ticketId"].includes(sortBy)) {
    throw new HttpError(400, "VALIDATION_ERROR", "Invalid sortBy field.");
  }

  const where = {
    ...(status ? { status } : {}),
    ...(unitId ? { unitId } : {}),
    ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    ...(priorityId ? { priorityId: Number(priorityId) } : {}),
  };

  const orderBy = { [sortBy]: sortDir } as const;

  const [items, totalItems] = await db.$transaction([
    db.complaint.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        unit: { select: { id: true, description: true, block: { select: { description: true } } } },
        reporter: { select: { id: true, fName: true, mName: true, sName: true } },
        assignee: { select: { id: true, fName: true, mName: true, sName: true } },
        category: { select: { id: true, description: true } },
        priority: { select: { id: true, label: true, slaHours: true } },
      },
    }),
    db.complaint.count({ where }),
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

// ---------------------------------------------------------------------------
// Get complaint by ID
// ---------------------------------------------------------------------------

export async function getComplaintById(id: string) {
  const complaint = await db.complaint.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, description: true, block: { select: { description: true } } } },
      reporter: { select: { id: true, fName: true, mName: true, sName: true } },
      assignee: { select: { id: true, fName: true, mName: true, sName: true } },
      category: { select: { id: true, description: true } },
      priority: { select: { id: true, label: true, slaHours: true } },
      notes: {
        orderBy: { createdAt: "asc" },
        select: { id: true, content: true, visibility: true, actorUserId: true, actorRole: true, createdAt: true },
      },
    },
  });
  if (!complaint) throw new HttpError(404, "NOT_FOUND", "Complaint not found.");
  return complaint;
}

// ---------------------------------------------------------------------------
// Create complaint (CM6, CM7 — ticketId; CM17 — immutable core fields)
// ---------------------------------------------------------------------------

export async function createComplaint(input: CreateComplaintInput, actor: AuthContext) {
  // Validate unit exists
  const unit = await db.unit.findUnique({ where: { id: input.unitId }, select: { id: true } });
  if (!unit) throw new HttpError(400, "VALIDATION_ERROR", "Unit not found.");

  // Validate reporter exists
  const reporter = await db.individual.findUnique({
    where: { id: input.reportedById },
    select: { id: true, isSystemIdentity: true },
  });
  if (!reporter) throw new HttpError(400, "VALIDATION_ERROR", "Reporter individual not found.");
  if (reporter.isSystemIdentity) {
    throw new HttpError(400, "VALIDATION_ERROR", "System identities cannot be complaint reporters.");
  }

  // Validate category and priority
  const category = await db.complaintCategory.findUnique({ where: { id: input.categoryId }, select: { id: true } });
  if (!category) throw new HttpError(400, "VALIDATION_ERROR", "Complaint category not found.");

  const priority = await db.complaintPriority.findUnique({ where: { id: input.priorityId }, select: { id: true } });
  if (!priority) throw new HttpError(400, "VALIDATION_ERROR", "Complaint priority not found.");

  const ticketId = await generateTicketId();

  const complaint = await db.complaint.create({
    data: {
      ticketId,
      unitId: input.unitId,
      reportedById: input.reportedById,
      categoryId: input.categoryId,
      priorityId: input.priorityId,
      title: input.title,
      description: input.description,
      isAnonymous: input.isAnonymous,
      status: "Open",
      actorUserId: actor.userId,
      actorRole: actor.role,
    },
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "COMPLAINT_CREATED",
    entityType: "Complaint",
    entityId: complaint.id,
    payload: {
      ticketId: complaint.ticketId,
      unitId: complaint.unitId,
      categoryId: complaint.categoryId,
      priorityId: complaint.priorityId,
      isAnonymous: complaint.isAnonymous,
    },
  });

  return complaint;
}

// ---------------------------------------------------------------------------
// Add note to complaint (CM14, CM15, CM16 — append-only, visibility control)
// ---------------------------------------------------------------------------

export async function addComplaintNote(
  input: CreateComplaintNoteInput,
  actor: AuthContext
) {
  // Validate complaint exists
  const complaint = await db.complaint.findUnique({
    where: { id: input.complaintId },
    select: { id: true, status: true },
  });
  if (!complaint) throw new HttpError(404, "NOT_FOUND", "Complaint not found.");

  // Only Admin/Manager may create Internal notes (CM15)
  if (input.visibility === "Internal" && actor.role === "READ_ONLY") {
    throw new HttpError(403, "FORBIDDEN", "READ_ONLY role cannot create Internal notes.");
  }

  const note = await db.complaintNote.create({
    data: {
      complaintId: input.complaintId,
      content: input.content,
      visibility: input.visibility,
      actorUserId: actor.userId,
      actorRole: actor.role,
    },
  });

  await writeAuditLog(db, {
    actorUserId: actor.userId,
    actorRole: actor.role,
    action: "COMPLAINT_NOTE_ADDED",
    entityType: "Complaint",
    entityId: input.complaintId,
    payload: { noteId: note.id, visibility: note.visibility },
  });

  return note;
}

// ---------------------------------------------------------------------------
// Reference data lookups (for form dropdowns)
// ---------------------------------------------------------------------------

export async function listComplaintCategories() {
  return db.complaintCategory.findMany({ orderBy: { id: "asc" } });
}

export async function listComplaintPriorities() {
  return db.complaintPriority.findMany({ orderBy: { id: "asc" } });
}
