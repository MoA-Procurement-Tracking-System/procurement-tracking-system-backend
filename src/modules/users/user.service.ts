import { prisma } from '../../config/database.js';
import { hashPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/errors.js';
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
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize, search, role, isActive } = query;
  const skip = (page - 1) * pageSize;

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

  const [data, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: safeSelect,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

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
