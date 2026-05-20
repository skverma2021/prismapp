import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole } from "@/src/lib/authz";
import { addComplaintNote } from "@/src/modules/complaints/complaints.service";
import { parseCreateComplaintNoteInput } from "@/src/modules/complaints/complaints.schemas";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireMutationRole(request);
    const payload = await request.json();
    const input = parseCreateComplaintNoteInput(payload);
    const data = await addComplaintNote(input, actor);
    return ok(data, 201);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
