import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { parseCreateContributionCorrectionInput } from "@/src/modules/contributions/contributions.schemas";
import { createContributionCorrection } from "@/src/modules/contributions/contributions.service";

export async function POST(request: Request) {
  try {
    const auth = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateContributionCorrectionInput(payload);
    const data = await createContributionCorrection(input, {
      actorUserId: auth.userId,
      actorRole: auth.role,
    });
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
