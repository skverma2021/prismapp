// Pure, side-effect-free helpers extracted from ownerships.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import { HttpError } from "@/src/lib/api-response";

/**
 * Returns true if two date ranges overlap (inclusive on both ends).
 * null toDt means the range is open-ended (no end date).
 *
 * Adjacent ranges (A.toDt == B.fromDt same day) ARE considered overlapping
 * because toDt is inclusive in the domain model — ownership rows close on
 * toDt, so the same day cannot belong to two owners.
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date | null,
  bStart: Date,
  bEnd: Date | null
): boolean {
  const aEndTime = aEnd ? aEnd.getTime() : Number.POSITIVE_INFINITY;
  const bEndTime = bEnd ? bEnd.getTime() : Number.POSITIVE_INFINITY;

  return aStart.getTime() <= bEndTime && bStart.getTime() <= aEndTime;
}

/**
 * Returns a new Date that is `days` calendar days after `value`.
 * Uses millisecond arithmetic — safe across daylight-saving boundaries
 * because ownership dates are UTC midnight.
 */
export function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

/**
 * Throws HttpError 400 VALIDATION_ERROR when `fromDt` is earlier than
 * `unitInceptionDt`. `label` is used in the error message to identify
 * the field being validated.
 */
export function ensureNotBeforeUnitInception(
  unitInceptionDt: Date,
  fromDt: Date,
  label: string
): void {
  if (fromDt.getTime() < unitInceptionDt.getTime()) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      `${label} cannot be earlier than the unit inception date (${unitInceptionDt.toISOString().slice(0, 10)}).`
    );
  }
}
