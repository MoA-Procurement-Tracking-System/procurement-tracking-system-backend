import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';
import { hashPassword } from '../auth/auth.security.js';
import { UserRole } from '../../generated/prisma/index.js';
import type { Prisma } from '../../generated/prisma/index.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  SafeUser,
} from './user.types.js';

export function normalizeToUserRole(role?: string): UserRole {
  switch (role) {
    case 'ProcurementOfficer':
    case 'OFFICER':
      return UserRole.OFFICER;
    case 'ProcurementDirector':
    case 'ProjectManager':
    case 'DIRECTOR':
      return UserRole.DIRECTOR;
    case 'ManagementTeam':
    case 'MANAGEMENT':
      return UserRole.MANAGEMENT;
    case 'ENDORSING_COMMITTEE':
      return UserRole.ENDORSING_COMMITTEE;
    case 'Administrator':
    case 'ADMIN':
      return UserRole.ADMIN;
    default:
      return UserRole.OFFICER;
  }
}

const safeSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  displayName: true,
  authRole: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const safeSelectWithLastLogin = {
  ...safeSelect,
  sessions: {
    select: { lastSeenAt: true },
    orderBy: { lastSeenAt: 'desc' as const },
    take: 1,
  },
} as const;

export async function listUsers(query: Partial<ListUsersQuery> = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(query.pageSize) || 25));
  const skip = (page - 1) * pageSize;
  const { search, role, isActive } = query;

  const conditions: Prisma.UserWhereInput[] = [];

  if (search) {
    conditions.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  if (role) {
    const authRoleVal = normalizeToUserRole(role);
    conditions.push({ authRole: authRoleVal });
  }

  if (isActive !== undefined) {
    const activeBool = String(isActive) === 'true' || isActive === true;
    conditions.push({
      isActive: activeBool,
    });
  }

  const where: Prisma.UserWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};

  const [rawData, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: safeSelectWithLastLogin,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  const data: SafeUser[] = rawData.map(({ sessions, ...user }) => ({
    ...user,
    role: user.authRole,
    lastLoginAt: sessions[0]?.lastSeenAt ?? null,
  }));

  return {
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: safeSelect,
  });
  if (!user) throw ApiError.notFound('User not found');
  return {
    ...user,
    role: user.authRole,
  };
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing)
    throw ApiError.conflict('Email already in use', [
      { field: 'email', message: 'already in use' },
    ]);

  const passwordHash = await hashPassword(input.password);
  const normalizedRole = normalizeToUserRole(input.authRole || input.role);
  const user = await prisma.user.create({
    data: {
      name: input.name,
      displayName: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      authRole: normalizedRole,

      mustChangePassword: true,
    },
    select: safeSelect,
  });

  return {
    ...user,
    role: user.authRole,
  };
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('User not found');

  if (input.email) {
    const conflict = await prisma.user.findFirst({
      where: { email: input.email.toLowerCase(), NOT: { id } },
    });
    if (conflict)
      throw ApiError.conflict('Email already in use', [
        { field: 'email', message: 'already in use' },
      ]);
  }

  const updateData: Record<string, unknown> = {
    ...(input.name && { name: input.name, displayName: input.name }),
    ...(input.email && { email: input.email.toLowerCase() }),
    ...(input.isActive !== undefined && { isActive: input.isActive }),
  };

  if (input.authRole || input.role) {
    updateData.authRole = normalizeToUserRole(input.authRole || input.role);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData as Parameters<typeof prisma.user.update>[0]['data'],
    select: safeSelect,
  });

  return {
    ...user,
    role: user.authRole,
  };
}
