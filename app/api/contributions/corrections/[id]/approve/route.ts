import { fail, fromUnknownError, getRequestId, ok, HttpError } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { approveCorrection, rejectCorrection } from "@/src/modules/contributions/contributions.service";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const auth = await requireAdminRole(request);
    const { id } = await params;
    const correctionId = parseInt(id, 10);
    if (isNaN(correctionId)) {
      throw new HttpError(400, "VALIDATION_ERROR", "Invalid correction id.");
    }
    const data = await approveCorrection(correctionId, {
      actorUserId: auth.userId,
      actorRole: auth.role,
    });
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
