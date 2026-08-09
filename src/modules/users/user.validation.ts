import { z } from 'zod';

const roleValues = [
  'ProcurementOfficer',
  'ProcurementDirector',
  'Administrator',
  'ManagementTeam',
  'ProjectManager',
] as const;

const roleEnum = z.enum(roleValues);
const emailSchema = z.email({ message: 'Invalid email address' });

export const createUserSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  // Mirrors the password policy used at signup/reset — keep these in sync
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/\d/, 'Password must contain a number'),
  role: roleEnum,
});

export const updateUserSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    email: emailSchema.optional(),
    role: roleEnum.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(120).optional(),
  role: roleEnum.optional(),
  isActive: z.coerce.boolean().optional(),
});

export const userIdParamSchema = z.object({
  id: z.uuid('Invalid user id'),
});
