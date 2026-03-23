import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { createContribution, listContributions } from "@/src/modules/contributions/contributions.service";
import { parseCreateContributionInput } from "@/src/modules/contributions/contributions.schemas";

export async function GET(request: NextRequest) {
  try {
    const data = await listContributions(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateContributionInput(payload);
    const data = await createContribution(input, {
      actorUserId: auth.userId,
      actorRole: auth.role,
    });
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
