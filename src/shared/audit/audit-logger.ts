import { Prisma } from '../../generated/prisma/index.js';
import { prisma } from '../../config/database.js';
import { logger } from '../../config/logger.js';

export interface AuditLogOptions {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, unknown>;
}

export async function createAuditLog(
  options: AuditLogOptions,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const db = tx ?? prisma;
  const { userId, action, entityType, entityId, changes } = options;

  try {
    let validUserId = userId;

    if (userId) {
      const existingUser = await db.user.findFirst({
        where: { OR: [{ id: userId }, { email: userId }] },
        select: { id: true },
      });
      if (existingUser) {
        validUserId = existingUser.id;
      } else {
        validUserId = null;
      }
    }

    await db.auditLog.create({
      data: {
        ...(validUserId ? { userId: validUserId } : {}),
        action,
        entityType,
        entityId: entityId ?? null,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
      },
    });
  } catch (err) {
    logger.warn(
      { err, action, entityType, entityId },
      'Failed to create audit log entry',
    );
  }
}
