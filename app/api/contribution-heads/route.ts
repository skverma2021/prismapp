import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  createContributionHead,
  listContributionHeads,
} from "@/src/modules/contribution-heads/contribution-heads.service";
import { 
  parseCreateContributionHeadInput 
} from "@/src/modules/contribution-heads/contribution-heads.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listContributionHeads(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateContributionHeadInput(payload);
    const data = await createContributionHead(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
