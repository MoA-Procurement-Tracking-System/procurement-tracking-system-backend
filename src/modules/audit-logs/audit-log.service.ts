import { prisma } from '../../config/database.js';

export async function listAuditLogs(
  query: {
    page?: number;
    pageSize?: number;
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    search?: string;
  } = {},
) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 25));
  const skip = (page - 1) * pageSize;
  const { userId, entityType, entityId, action, search } = query;

  const searchFilter = search ? search.trim().toLowerCase() : null;

  const auditWhere = {
    ...(userId && { userId }),
    ...(entityType && entityType !== 'AUTH' && { entityType }),
    ...(entityId && { entityId }),
    ...(action && { action }),
  };

  const authWhere = {
    ...(userId && { userId }),
    ...(action && { event: action }),
    ...(entityId && { email: entityId }),
  };

  const isAuthOnly = entityType === 'AUTH';
  const isSystemOnly = entityType && entityType !== 'AUTH';

  const [auditData, authData] = await Promise.all([
    isAuthOnly
      ? Promise.resolve([])
      : prisma.auditLog.findMany({
          where: auditWhere,
          take: 200,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
    isSystemOnly
      ? Promise.resolve([])
      : prisma.authAuditLog.findMany({
          where: authWhere,
          take: 200,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { id: true, name: true, email: true } } },
        }),
  ]);

  const formattedAuthData = authData.map((a) => ({
    id: a.id,
    userId: a.userId,
    action: a.event,
    entityType: 'AUTH',
    entityId: a.userId || a.email || null,
    changes: {
      status: a.success ? 'Success' : 'Failed',
      ...(a.email ? { email: a.email } : {}),
      ...(typeof a.metadata === 'object' && a.metadata
        ? Object.fromEntries(
            Object.entries(a.metadata as Record<string, unknown>).filter(
              ([k]) => k.toLowerCase() !== 'createdby',
            ),
          )
        : {}),
    },
    createdAt: a.createdAt,
    user: a.user
      ? { id: a.user.id, name: a.user.name, email: a.user.email }
      : a.email
        ? { id: a.userId || '', name: a.email, email: a.email }
        : null,
  }));

  let combined = [...auditData, ...formattedAuthData].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  if (searchFilter) {
    combined = combined.filter(
      (item) =>
        item.action.toLowerCase().includes(searchFilter) ||
        (item.user?.name &&
          item.user.name.toLowerCase().includes(searchFilter)) ||
        (item.user?.email &&
          item.user.email.toLowerCase().includes(searchFilter)) ||
        (item.entityId && item.entityId.toLowerCase().includes(searchFilter)) ||
        (item.entityType &&
          item.entityType.toLowerCase().includes(searchFilter)),
    );
  }

  const paginatedData = combined.slice(skip, skip + pageSize);
  const total = combined.length;

  return {
    data: paginatedData,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
