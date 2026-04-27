import { Prisma, PrismaClient } from "@prisma/client";

type AuditEntry = {
  actorUserId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  payload?: Prisma.InputJsonValue;
};

/**
 * Write an audit log entry using the top-level Prisma client.
 *
 * Driver adapters (@prisma/adapter-pg) do not guarantee atomicity for
 * interactive transactions, so audit writes are performed outside the
 * business-logic transaction.  Failures are logged but never propagate
 * to the caller — the contribution row itself already carries
 * actorUserId / actorRole as the primary audit trail.
 */
export async function writeAuditLog(
  client: PrismaClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await client.auditLog.create({
      data: {
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole,
        action: entry.action,
        entityType: entry.entityType,
        entityId: String(entry.entityId),
        payload: (entry.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    console.error("[audit-log] Failed to write audit entry:", entry.action, entry.entityId, error);
  }
}
