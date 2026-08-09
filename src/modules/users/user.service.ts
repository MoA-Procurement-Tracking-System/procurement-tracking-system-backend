import { hashPassword } from '../../utils/password.js';
import { ApiError } from '../../utils/errors.js';
import type {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
  SafeUser,
} from './user.types.js';

export async function listUsers(query: ListUsersQuery) {
  const { page, pageSize } = query;

  return {
    data: [] as SafeUser[],
    meta: {
      page,
      pageSize,
      total: 0,
      totalPages: 1,
    },
  };
}

export async function getUserById(id: string): Promise<SafeUser> {
  if (!id) throw ApiError.notFound('User not found');
  throw ApiError.notFound('User not found');
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);

  return {
    id: 'placeholder-user',
    name: input.name,
    email: input.email.toLowerCase(),
    role: input.role,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    passwordHash,
  } as SafeUser & { passwordHash?: string } as SafeUser;
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
): Promise<SafeUser> {
  if (!id) throw ApiError.notFound('User not found');

  return {
    id,
    name: input.name ?? 'Updated User',
    email: input.email?.toLowerCase() ?? 'updated@example.com',
    role: input.role ?? 'ProcurementOfficer',
    isActive: input.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
