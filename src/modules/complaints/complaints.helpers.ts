// Pure, side-effect-free helpers extracted from complaints.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import { HttpError } from "@/src/lib/api-response";

/**
 * Valid status transition graph (CM1, CM2, CM4b).
 * `Closed` is reachable only from `Resolved`, so every ticket passes through the
 * reopen window. A `Reopened` ticket must be worked and resolved again before it
 * can be closed. The detail page keeps a copy of this table for button visibility.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  Open: ["Assigned", "InProgress"],
  Assigned: ["InProgress"],
  InProgress: ["Resolved"],
  Resolved: ["Closed", "Reopened"],
  Closed: [],
  Reopened: ["Assigned", "InProgress"],
};

/**
 * CM4a: a Resolved complaint cannot be closed while its reopen window is open.
 * Reopen is allowed up to and including `reopenDeadline` (CM3), so closing is
 * allowed only strictly after it. A null deadline means there is no window to protect.
 */
export function isReopenWindowOpen(reopenDeadline: Date | null, now: Date): boolean {
  return reopenDeadline !== null && now.getTime() <= reopenDeadline.getTime();
}

export function assertReopenWindowElapsed(
  complaint: { reopenDeadline: Date | null },
  now: Date
): void {
  if (isReopenWindowOpen(complaint.reopenDeadline, now)) {
    throw new HttpError(
      409,
      "PRECONDITION_FAILED",
      `The reopen window is still open. This complaint can be closed after ${complaint.reopenDeadline!.toISOString()}.`
    );
  }
}
