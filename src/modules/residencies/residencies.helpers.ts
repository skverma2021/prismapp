// Pure, side-effect-free helpers extracted from residencies.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import { HttpError } from "@/src/lib/api-response";

/**
 * Returns true if two date ranges overlap (inclusive on both ends).
 * null toDt means the range is open-ended (no end date).
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
