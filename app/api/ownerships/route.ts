import type { NextRequest } from "next/server";
import { fail, fromUnknownError, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { createOwnership, listOwnerships } from "@/src/modules/ownerships/ownerships.service";
import { parseCreateOwnershipInput } from "@/src/modules/ownerships/ownerships.schemas";

export async function GET(request: NextRequest) {
  try {
    const data = await listOwnerships(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}

export async function POST(request: Request) {
  try {
    requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateOwnershipInput(payload);
    const data = await createOwnership(input);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error));
  }
}
