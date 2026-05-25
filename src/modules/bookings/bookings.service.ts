import { db } from "@/src/lib/db";
import { HttpError, parseQueryInt } from "@/src/lib/api-response";
import { writeAuditLog } from "@/src/lib/audit-log";
import type { AuthContext } from "@/src/lib/user-role";
import type { CreateBookingInput, UpdateBookingStatusInput } from "./bookings.schemas";

// Valid status transition graph
const VALID_TRANSITIONS: Record<string, string[]> = {
  Pending: ["Approved", "Rejected", "Cancelled"],
  Approved: ["Cancelled"],
  Rejected: [],
  Cancelled: [],
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseOptionalPositiveInt(v: string | null | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v, 10);
  return Number.isNaN(n) || n <= 0 ? undefined : n;
}

function parseDateParam(v: string | null | undefined): Date | undefined {
  if (!v) return undefined;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

// ---------------------------------------------------------------------------
// listResources
// ---------------------------------------------------------------------------

export async function listResources() {
  return db.resource.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
}

// ---------------------------------------------------------------------------
// listBookings
// ---------------------------------------------------------------------------

export async function listBookings(searchParams: URLSearchParams) {
  const page = parseQueryInt(searchParams.get("page"), DEFAULT_PAGE);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseQueryInt(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE)),
  );
  const skip = (page - 1) * pageSize;

  const status = searchParams.get("status") ?? undefined;
  const resourceId = parseOptionalPositiveInt(searchParams.get("resourceId") ?? undefined);
  const fromDt = parseDateParam(searchParams.get("from") ?? undefined);
  const toDt = parseDateParam(searchParams.get("to") ?? undefined);

  const where = {
    ...(status ? { status } : {}),
    ...(resourceId ? { resourceId } : {}),
    ...(fromDt || toDt
      ? {
          startDt: {
            ...(fromDt ? { gte: fromDt } : {}),
            ...(toDt ? { lte: toDt } : {}),
          },
        }
      : {}),
  };

  const sortParam = searchParams.get("sort") ?? "startDt";
  const sortDir = searchParams.get("sortDir") === "desc" ? "desc" : "asc";
  const allowedSortFields = ["startDt", "createdAt", "status"] as const;
  const sortField = allowedSortFields.includes(sortParam as (typeof allowedSortFields)[number])
    ? (sortParam as (typeof allowedSortFields)[number])
    : "startDt";

  const [total, items] = await Promise.all([
    db.booking.count({ where }),
    db.booking.findMany({
      where,
      orderBy: { [sortField]: sortDir },
      skip,
      take: pageSize,
      include: {
        resource: { select: { id: true, name: true } },
        requestedBy: { select: { id: true, fName: true, sName: true } },
      },
    }),
  ]);

  return { items, total, page, pageSize };
}

// ---------------------------------------------------------------------------
// getBookingById
// ---------------------------------------------------------------------------

export async function getBookingById(id: string) {
  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      resource: true,
      requestedBy: { select: { id: true, fName: true, sName: true } },
    },
  });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Booking not found.");
  return booking;
}

// ---------------------------------------------------------------------------
// createBooking
// ---------------------------------------------------------------------------

export async function createBooking(input: CreateBookingInput, actor: AuthContext) {
  // BK10: resource must be active
  const resource = await db.resource.findUnique({ where: { id: input.resourceId } });
  if (!resource) throw new HttpError(404, "NOT_FOUND", "Resource not found.");
  if (!resource.isActive) {
    throw new HttpError(422, "VALIDATION_ERROR", "Resource is not available for bookings (BK10).");
  }

  const booking = await db.booking.create({
    data: {
      resourceId: input.resourceId,
      requestedById: input.requestedById,
      title: input.title,
      purpose: input.purpose,
      startDt: input.startDt,
      endDt: input.endDt,
      guestCount: input.guestCount,
      status: "Pending",
      actorUserId: actor.userId,
      actorRole: actor.role,
    },
  });

  await writeAuditLog(db, {
    entityType: "Booking",
    entityId: booking.id,
    action: "BOOKING_CREATED",
    actorUserId: actor.userId,
    actorRole: actor.role,
    payload: { status: "Pending", resourceId: input.resourceId },
  });

  return booking;
}

// ---------------------------------------------------------------------------
// updateBookingStatus
// ---------------------------------------------------------------------------

export async function updateBookingStatus(
  id: string,
  input: UpdateBookingStatusInput,
  actor: AuthContext,
) {
  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) throw new HttpError(404, "NOT_FOUND", "Booking not found.");

  const allowed = VALID_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(input.status)) {
    throw new HttpError(
      422,
      "VALIDATION_ERROR",
      `Cannot transition from ${booking.status} to ${input.status}.`,
    );
  }

  // BK2: overlap check on Approve
  if (input.status === "Approved") {
    const overlap = await db.booking.findFirst({
      where: {
        resourceId: booking.resourceId,
        status: "Approved",
        id: { not: id },
        AND: [
          { startDt: { lt: booking.endDt } },
          { endDt: { gt: booking.startDt } },
        ],
      },
    });
    if (overlap) {
      throw new HttpError(
        409,
        "CONFLICT",
        "This time slot overlaps with an already-approved booking for the same resource (BK2).",
      );
    }
  }

  // BK6: cancellation only allowed before start
  if (input.status === "Cancelled" && booking.startDt <= new Date()) {
    throw new HttpError(422, "VALIDATION_ERROR", "Cannot cancel a booking that has already started (BK6).");
  }

  const now = new Date();
  const updated = await db.booking.update({
    where: { id },
    data: {
      status: input.status,
      ...(input.status === "Approved"
        ? { approvedById: actor.userId, approvedAt: now }
        : {}),
      ...(input.status === "Rejected"
        ? {
            rejectedById: actor.userId,
            rejectedAt: now,
            rejectionReason: input.rejectionReason,
          }
        : {}),
      ...(input.status === "Cancelled"
        ? {
            cancelledById: actor.userId,
            cancelledAt: now,
            cancellationReason: input.cancellationReason,
          }
        : {}),
    },
    include: {
      resource: true,
      requestedBy: { select: { id: true, fName: true, sName: true } },
    },
  });

  await writeAuditLog(db, {
    entityType: "Booking",
    entityId: id,
    action: "BOOKING_STATUS_UPDATED",
    actorUserId: actor.userId,
    actorRole: actor.role,
    payload: { from: booking.status, to: input.status },
  });

  return updated;
}
