// Pure, side-effect-free helpers extracted from complaints.service.ts.
// Exported so they can be unit-tested without mocking the database or HTTP layer.

import { HttpError } from "@/src/lib/api-response";

/**
 * CM4a: a Resolved complaint cannot be closed while its reopen window is open.
 * Reopen is allowed up to and including `reopenDeadline` (CM3), so closing is
 * allowed only strictly after it. A null deadline means there is no window to protect.
 */
export function isReopenWindowOpen(reopenDeadline: Date | null, now: Date): boolean {
  return reopenDeadline !== null && now.getTime() <= reopenDeadline.getTime();
}

export function assertResolvedCanBeClosed(
  complaint: { status: string; reopenDeadline: Date | null },
  now: Date
): void {
  if (complaint.status !== "Resolved") return;

  if (isReopenWindowOpen(complaint.reopenDeadline, now)) {
    throw new HttpError(
      409,
      "PRECONDITION_FAILED",
      `The reopen window is still open. This complaint can be closed after ${complaint.reopenDeadline!.toISOString()}.`
    );
  }
}
