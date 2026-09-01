import { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

export interface AuditLogOptions {
  userId?: string | null | undefined;
  action: string;
  entityType: string;
  entityId?: string | null | undefined;
  changes?: Record<string, unknown> | undefined;
}

/**
 * Creates an immutable AuditLog entry in the database.
 * Can be executed inside an existing Prisma transaction or standalone.
 */
export async function createAuditLog(
  options: AuditLogOptions,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const { userId, action, entityType, entityId, changes } = options;

  try {
    let validUserId: string | null = null;

    if (userId) {
      const existingUser = await db.user.findFirst({
        where: { OR: [{ id: userId }, { email: userId }] },
        select: { id: true },
      });
      if (existingUser) {
        validUserId = existingUser.id;
      }
    }

    const data: Prisma.AuditLogCreateInput = {
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
    };

    if (validUserId) {
      data.user = { connect: { id: validUserId } };
    }

    await db.auditLog.create({ data });
  } catch (err) {
    logger.warn(
      { err, action, entityType, entityId },
      'Failed to create audit log entry',
    );
  }
}
