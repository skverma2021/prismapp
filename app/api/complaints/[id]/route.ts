import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  getComplaintById,
  updateComplaint,
} from "@/src/modules/complaints/complaints.service";
import { parseUpdateComplaintInput } from "@/src/modules/complaints/complaints.schemas";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireReadRole(request);
    const { id } = await params;
    const data = await getComplaintById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireMutationRole(request);
    const { id } = await params;
    const payload = await request.json();
    const input = parseUpdateComplaintInput(payload);
    const data = await updateComplaint(id, input, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
