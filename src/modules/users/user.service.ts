import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';
import { hashPassword } from '../auth/auth.security.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  SafeUser,
} from './user.types.js';

const safeSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  displayName: true,
  role: true,
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

  const where = {
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(role && { role }),
    ...(isActive !== undefined && { isActive }),
  };

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

  const data = rawData.map(({ sessions, ...user }) => ({
    ...user,
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
  return user;
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
  return prisma.user.create({
    data: {
      name: input.name,
      displayName: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role,
      mustChangePassword: true,
    },
    select: safeSelect,
  });
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

  return prisma.user.update({
    where: { id },
    data: {
      ...input,
      ...(input.email && { email: input.email.toLowerCase() }),
    },
    select: safeSelect,
  });
}
