import type { NextRequest } from "next/server";
import { fail, fromUnknownError, getRequestId, ok } from "@/src/lib/api-response";
import { requireMutationRole, requireReadRole } from "@/src/lib/authz";
import {
  getBookingById,
  updateBookingStatus,
} from "@/src/modules/bookings/bookings.service";
import { parseUpdateBookingStatusInput } from "@/src/modules/bookings/bookings.schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireReadRole(request);
    const { id } = await params;
    const data = await getBookingById(id);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireMutationRole(request);
    const { id } = await params;
    const payload = await request.json();
    const result = parseUpdateBookingStatusInput(payload);
    if (!result.ok) {
      return fail(fromUnknownError(new Error(result.error), getRequestId(request)));
    }
    const data = await updateBookingStatus(id, result.value, actor);
    return ok(data);
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
