import { fail, fromUnknownError, getRequestId, ok, HttpError } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { rejectCorrection } from "@/src/modules/contributions/contributions.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireAdminRole(request);
    const { id } = await params;
    const correctionId = parseInt(id, 10);
    if (isNaN(correctionId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid correction id.");
    }

    const body = await request.json() as { rejectionReason?: unknown };
    const reason = typeof body.rejectionReason === "string" ? body.rejectionReason.trim() : "";
    if (!reason) {
      throw new HttpError(400, "VALIDATION_ERROR", "rejectionReason is required.");
    }

    const data = await rejectCorrection(correctionId, reason, {
      actorUserId: auth.userId,
      actorRole: auth.role,
    });
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
