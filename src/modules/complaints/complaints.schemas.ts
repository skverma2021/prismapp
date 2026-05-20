import { HttpError, parseOptionalString, parsePositiveInt, requireString } from "@/src/lib/api-response";

// ---------------------------------------------------------------------------
// Complaint status constants (CM1–CM2)
// ---------------------------------------------------------------------------

export const COMPLAINT_STATUSES = [
  "Open",
  "Assigned",
  "InProgress",
  "Resolved",
  "Closed",
  "Reopened",
] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

export const NOTE_VISIBILITIES = ["Internal", "Resident"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITIES)[number];

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export type CreateComplaintInput = {
  unitId: string;
  reportedById: string;
  categoryId: number;
  priorityId: number;
  title: string;
  description: string;
  isAnonymous: boolean;
};

export type CreateComplaintNoteInput = {
  complaintId: string;
  content: string;
  visibility: NoteVisibility;
};

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

export function parseCreateComplaintInput(payload: unknown): CreateComplaintInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }
  const r = payload as Record<string, unknown>;

  const unitId = requireString(r.unitId, "unitId");
  const reportedById = requireString(r.reportedById, "reportedById");
  const categoryId = parsePositiveInt(r.categoryId, "categoryId");
  const priorityId = parsePositiveInt(r.priorityId, "priorityId");
  const title = requireString(r.title, "title");
  const description = requireString(r.description, "description");
  const isAnonymous = typeof r.isAnonymous === "boolean" ? r.isAnonymous : false;

  return { unitId, reportedById, categoryId, priorityId, title, description, isAnonymous };
}

export function parseCreateComplaintNoteInput(payload: unknown): CreateComplaintNoteInput {
  if (typeof payload !== "object" || payload === null) {
    throw new HttpError(400, "VALIDATION_ERROR", "Payload must be an object.");
  }
  const r = payload as Record<string, unknown>;

  const complaintId = requireString(r.complaintId, "complaintId");
  const content = requireString(r.content, "content");
  const rawVisibility = parseOptionalString(r.visibility);
  if (!rawVisibility || !(NOTE_VISIBILITIES as readonly string[]).includes(rawVisibility)) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `visibility must be one of: ${NOTE_VISIBILITIES.join(", ")}.`
    );
  }

  return { complaintId, content, visibility: rawVisibility as NoteVisibility };
}
