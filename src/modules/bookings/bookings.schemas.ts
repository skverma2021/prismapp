export const BOOKING_STATUSES = ["Pending", "Approved", "Rejected", "Cancelled"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export type CreateBookingInput = {
  resourceId: number;
  requestedById: string;
  title: string;
  purpose?: string;
  startDt: Date;
  endDt: Date;
  guestCount: number;
};

export type UpdateBookingStatusInput = {
  status: BookingStatus;
  rejectionReason?: string;
  cancellationReason?: string;
};

const MIN_BOOKING_MS = 30 * 60 * 1000; // BK3: 30 minutes minimum

export function parseCreateBookingInput(
  payload: unknown,
): { ok: true; value: CreateBookingInput } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Request body must be an object." };
  }
  const p = payload as Record<string, unknown>;

  const resourceId = Number(p["resourceId"]);
  if (!Number.isInteger(resourceId) || resourceId <= 0) {
    return { ok: false, error: "resourceId must be a positive integer." };
  }

  const requestedById =
    typeof p["requestedById"] === "string" ? p["requestedById"].trim() : "";
  if (!requestedById) {
    return { ok: false, error: "requestedById is required." };
  }

  const title = typeof p["title"] === "string" ? p["title"].trim() : "";
  if (!title) {
    return { ok: false, error: "title is required." };
  }

  const purpose =
    typeof p["purpose"] === "string" ? p["purpose"].trim() || undefined : undefined;

  const startDtRaw = p["startDt"];
  const endDtRaw = p["endDt"];
  const startDt =
    typeof startDtRaw === "string" || typeof startDtRaw === "number"
      ? new Date(startDtRaw)
      : null;
  const endDt =
    typeof endDtRaw === "string" || typeof endDtRaw === "number"
      ? new Date(endDtRaw)
      : null;

  if (!startDt || isNaN(startDt.getTime())) {
    return { ok: false, error: "startDt must be a valid date/time." };
  }
  if (!endDt || isNaN(endDt.getTime())) {
    return { ok: false, error: "endDt must be a valid date/time." };
  }

  // BK4: start must be in the future
  if (startDt <= new Date()) {
    return { ok: false, error: "startDt must be in the future (BK4)." };
  }

  // BK3: minimum 30-minute slot
  if (endDt.getTime() - startDt.getTime() < MIN_BOOKING_MS) {
    return { ok: false, error: "Booking duration must be at least 30 minutes (BK3)." };
  }

  const guestCount = Number(p["guestCount"] ?? 0);
  if (!Number.isInteger(guestCount) || guestCount < 0) {
    return { ok: false, error: "guestCount must be a non-negative integer." };
  }

  return {
    ok: true,
    value: { resourceId, requestedById, title, purpose, startDt, endDt, guestCount },
  };
}

export function parseUpdateBookingStatusInput(
  payload: unknown,
): { ok: true; value: UpdateBookingStatusInput } | { ok: false; error: string } {
  if (typeof payload !== "object" || payload === null) {
    return { ok: false, error: "Request body must be an object." };
  }
  const p = payload as Record<string, unknown>;

  const status = p["status"];
  if (!BOOKING_STATUSES.includes(status as BookingStatus)) {
    return { ok: false, error: `status must be one of: ${BOOKING_STATUSES.join(", ")}.` };
  }
  const s = status as BookingStatus;

  const rejectionReason =
    typeof p["rejectionReason"] === "string" ? p["rejectionReason"].trim() || undefined : undefined;
  const cancellationReason =
    typeof p["cancellationReason"] === "string"
      ? p["cancellationReason"].trim() || undefined
      : undefined;

  if (s === "Rejected" && !rejectionReason) {
    return { ok: false, error: "rejectionReason is required when status is Rejected." };
  }

  return { ok: true, value: { status: s, rejectionReason, cancellationReason } };
}
