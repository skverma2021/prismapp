import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireAdminRole } from "@/src/lib/authz";
import { getAppUserById, updateAppUser } from "@/src/modules/app-users/app-users.service";
import { parseUpdateAppUserInput } from "@/src/modules/app-users/app-users.schemas";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAdminRole(request);
    const { id } = await params;
    const data = await getAppUserById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdminRole(request);
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateAppUserInput(payload);
    const data = await updateAppUser(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
