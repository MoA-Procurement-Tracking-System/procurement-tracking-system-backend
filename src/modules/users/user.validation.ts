import { z } from 'zod';
import { registry } from '../../config/openapi.js';

const roleValues = [
  'ProcurementOfficer',
  'ProcurementDirector',
  'Administrator',
  'ManagementTeam',
  'ProjectManager',
  'EndorsingCommittee',
  'OFFICER',
  'DIRECTOR',
  'ENDORSING_COMMITTEE',
  'MANAGEMENT',
  'ADMIN',
] as const;

export const roleEnum = z.enum(roleValues);
export const emailSchema = z.email({ message: 'Invalid email address' });

export const createUserSchema = registry.register(
  'CreateUser',
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .openapi({ example: 'Abebe Kebede' }),
    email: emailSchema.openapi({ example: 'user@moa.gov.et' }),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/\d/, 'Password must contain a number')
      .openapi({ example: 'SecurePassword123!' }),
    role: roleEnum.openapi({ example: 'ProcurementOfficer' }),
  }),
);

export const updateUserSchema = registry.register(
  'UpdateUser',
  z
    .object({
      name: z
        .string()
        .trim()
        .min(2)
        .optional()
        .openapi({ example: 'Abebe Kebede' }),
      email: emailSchema.optional().openapi({ example: 'user@moa.gov.et' }),
      role: roleEnum.optional(),
      isActive: z.boolean().optional().openapi({ example: true }),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided',
    }),
);

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

// Register OpenAPI Paths
registry.registerPath({
  method: 'get',
  path: '/api/users',
  summary: 'List users',
  tags: ['Users'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: listUsersQuerySchema,
  },
  responses: {
    200: { description: 'List of users' },
    403: { description: 'Admin or Director only' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/users/{id}',
  summary: 'Get a user by id',
  tags: ['Users'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: userIdParamSchema,
  },
  responses: {
    200: { description: 'User found' },
    404: { description: 'User not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/users',
  summary: 'Create a user',
  tags: ['Users'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createUserSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'User created' },
    409: { description: 'Email already in use' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/users/{id}',
  summary: "Update a user's profile, role, or active status",
  tags: ['Users'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: userIdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: updateUserSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'User updated' },
    404: { description: 'User not found' },
    409: { description: 'Email already in use' },
  },
});
