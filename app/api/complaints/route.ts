import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import { listComplaints, createComplaint } from "@/src/modules/complaints/complaints.service";
import { parseCreateComplaintInput } from "@/src/modules/complaints/complaints.schemas";

export async function GET(request: NextRequest) {
  try {
    await requireReadRole(request);
    const data = await listComplaints(request.nextUrl.searchParams);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateComplaintInput(payload);
    const data = await createComplaint(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
