import { prisma } from '../../config/database.js';

export async function listAuditLogs(query: {
  page: number;
  pageSize: number;
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
}) {
  const { page, pageSize, userId, entityType, entityId, action } = query;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(userId && { userId }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(action && { action }),
  };

  const [data, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
