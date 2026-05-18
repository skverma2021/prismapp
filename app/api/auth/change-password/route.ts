import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { fail, fromUnknownError, getRequestId, HttpError, ok, requireString } from "@/src/lib/api-response";
import { getAuthContext } from "@/src/lib/authz";
import { db } from "@/src/lib/db";
import { writeAuditLog } from "@/src/lib/audit-log";

const BCRYPT_ROUNDS = 12;

export async function PATCH(request: NextRequest) {
  try {
    const actor = await getAuthContext(request);

    const payload = await request.json() as Record<string, unknown>;
    const currentPassword = requireString(payload.currentPassword, "currentPassword");
    const newPassword = requireString(payload.newPassword, "newPassword");

    if (newPassword.length < 10) {
      throw new HttpError(400, "VALIDATION_ERROR", "newPassword must be at least 10 characters.");
    }

    if (currentPassword === newPassword) {
      throw new HttpError(400, "VALIDATION_ERROR", "New password must differ from current password.");
    }

    const user = await db.appUser.findUnique({
      where: { id: actor.userId },
      select: { id: true, passwordHash: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new HttpError(404, "NOT_FOUND", "User account not found.");
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new HttpError(400, "VALIDATION_ERROR", "Current password is incorrect.");
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await db.appUser.update({
      where: { id: actor.userId },
      data: { passwordHash: newHash },
    });

    await writeAuditLog(db, {
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: "APP_USER_PASSWORD_CHANGED",
      entityType: "AppUser",
      entityId: actor.userId,
      payload: { selfService: true },
    });

    return ok({ message: "Password updated successfully." });
  } catch (error) {
    return fail(fromUnknownError(error, getRequestId(request)));
  }
}
