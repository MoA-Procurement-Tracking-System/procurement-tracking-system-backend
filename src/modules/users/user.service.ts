import { Prisma, type User } from '../../generated/prisma/client.js';
import { prisma } from '../../config/database.js';
import { ApiError } from '../../utils/errors.js';
import { generateOpaqueToken, hashPassword } from '../auth/auth.security.js';
import { UserRole, UserStatus, Role } from '../../generated/prisma/enums.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  SafeUser,
} from './user.types.js';

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize, search, role, isActive } = query;

  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { displayName: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role as Role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: users.map(toSafeUser),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { id },
  });
  if (!user) throw ApiError.notFound('User not found');
  return toSafeUser(user);
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });
  if (existing) {
    throw ApiError.conflict('Email already in use');
  }

  const timestamp = Date.now();
  const baseName = input.name.split(' ')[0]?.toLowerCase() || 'user';
  const username = `@${baseName}_${timestamp}`;

  const authRole = mapDbRoleToClientRole(input.role);

  const invitation = generateOpaqueToken();
  const invitationExpiresAt = new Date(Date.now() + 48 * 3600000); // 48 hours
  const invitationOnlyPasswordHash = await hashPassword(
    generateOpaqueToken().raw,
  );

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email.toLowerCase(),
      username,
      displayName: input.name,
      role: input.role as Role,
      authRole,
      status: UserStatus.INVITED,
      isActive: true,
      passwordHash: invitationOnlyPasswordHash,
      mustChangePassword: false,
      tempPasswordExpiresAt: null,
      invitationTokens: {
        create: {
          tokenHash: invitation.hash,
          expiresAt: invitationExpiresAt,
        },
      },
    },
  });

  return toSafeUser(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<SafeUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound('User not found');

  if (input.email && input.email.toLowerCase() !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw ApiError.conflict('Email already in use');
    }
  }

  let authRole = user.authRole;
  if (input.role) {
    authRole = mapDbRoleToClientRole(input.role);
  }

  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
    data.displayName = input.name;
  }
  if (input.email !== undefined) {
    data.email = input.email.toLowerCase();
  }
  if (input.role !== undefined) {
    data.role = input.role as Role;
    data.authRole = authRole;
  }
  if (input.isActive !== undefined) {
    data.isActive = input.isActive;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data,
  });

  return toSafeUser(updatedUser);
}

function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function mapDbRoleToClientRole(role: Role | string): UserRole {
  switch (role) {
    case 'ProcurementDirector':
      return UserRole.DIRECTOR;
    case 'ManagementTeam':
      return UserRole.ENDORSING_COMMITTEE;
    case 'Administrator':
      return UserRole.ADMIN;
    default:
      return UserRole.OFFICER;
  }
}
