import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { listAppUsers, createAppUser } from "@/src/modules/app-users/app-users.service";
import { parseCreateAppUserInput } from "@/src/modules/app-users/app-users.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAdminRole(request);
    const data = await listAppUsers(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdminRole(request);
    const payload = await request.json();
    const input = parseCreateAppUserInput(payload);
    const data = await createAppUser(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
