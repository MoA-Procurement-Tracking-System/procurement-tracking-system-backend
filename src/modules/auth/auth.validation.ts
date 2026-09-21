import { z } from 'zod';
import { registry } from '../../config/openapi.js';

const emailSchema = z.string().trim().email('Invalid email address');

export const loginSchema = registry.register(
  'LoginInput',
  z.object({
    email: emailSchema.openapi({ example: 'admin@example.com' }),
    password: z
      .string()
      .min(1, 'Password is required')
      .openapi({ example: 'Password123!' }),
    rememberMe: z
      .boolean()
      .optional()
      .default(false)
      .openapi({ example: false }),
  }),
);

export const sessionLoginSchema = registry.register(
  'SessionLoginInput',
  z.object({
    identifier: z
      .string()
      .trim()
      .min(1)
      .openapi({ example: 'admin@example.com' }),
    password: z.string().min(1).openapi({ example: 'Password123!' }),
    rememberMe: z
      .boolean()
      .optional()
      .default(false)
      .openapi({ example: false }),
  }),
);

export const forgotPasswordSchema = registry.register(
  'ForgotPasswordInput',
  z.object({
    email: emailSchema.openapi({ example: 'user@example.com' }),
  }),
);

export const resetPasswordSchema = registry.register(
  'ResetPasswordInput',
  z.object({
    token: z
      .string()
      .min(1, 'Token is required')
      .openapi({ example: 'token-abc-123' }),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number')
      .openapi({ example: 'NewSecret123!' }),
    confirmPassword: z
      .string()
      .optional()
      .openapi({ example: 'NewSecret123!' }),
  }),
);

export const createPasswordSchema = registry.register(
  'CreatePasswordInput',
  z.object({
    token: z
      .string()
      .min(1, 'Token is required')
      .openapi({ example: 'invite-token-abc' }),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .openapi({ example: 'NewSecret123!' }),
    confirmPassword: z.string().min(1).openapi({ example: 'NewSecret123!' }),
  }),
);

export const changePasswordSchema = registry.register(
  'ChangePasswordInput',
  z
    .object({
      currentPassword: z
        .string()
        .min(1, 'Current password is required')
        .openapi({ example: 'OldPassword123!' }),
      newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain an uppercase letter')
        .regex(/[0-9]/, 'Password must contain a number')
        .openapi({ example: 'NewSecret123!' }),
      confirmPassword: z
        .string()
        .optional()
        .openapi({ example: 'NewSecret123!' }),
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
      message: 'New password must be different from current password',
      path: ['newPassword'],
    }),
);

export const adminCreateUserSchema = registry.register(
  'AdminCreateUserInput',
  z.object({
    email: emailSchema.openapi({ example: 'officer@example.com' }),
    displayName: z
      .string()
      .trim()
      .min(2)
      .max(120)
      .openapi({ example: 'Abebe Bikila' }),
    role: z
      .enum([
        'OFFICER',
        'DIRECTOR',
        'ENDORSING_COMMITTEE',
        'MANAGEMENT_TEAM',
        'ADMIN',
      ])
      .openapi({ example: 'OFFICER' }),
  }),
);

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

const authSecurity = [{ bearerAuth: [] }, { cookieAuth: [] }];

// ─── Path Registrations ──────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  summary: 'Login to the system',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: sessionLoginSchema } },
    },
  },
  responses: {
    200: { description: 'Login successful' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/auth/session',
  summary: 'Get current session details',
  tags: ['Auth'],
  security: authSecurity,
  responses: {
    200: { description: 'Session active' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/change-password',
  summary: 'Change user password',
  tags: ['Auth'],
  security: authSecurity,
  request: {
    body: {
      content: { 'application/json': { schema: changePasswordSchema } },
    },
  },
  responses: {
    200: { description: 'Password changed' },
    400: { description: 'Bad request' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/logout',
  summary: 'Logout of the system',
  tags: ['Auth'],
  responses: {
    204: { description: 'Logged out successfully' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/forgot-password',
  summary: 'Request a password reset email',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: forgotPasswordSchema } },
    },
  },
  responses: {
    200: { description: 'Reset link sent' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/create-password',
  summary: 'Create password from an invitation token',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: createPasswordSchema } },
    },
  },
  responses: {
    200: { description: 'Password created' },
    400: { description: 'Invalid token' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/reset-password',
  summary: 'Reset password using a reset token',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: resetPasswordSchema } },
    },
  },
  responses: {
    200: { description: 'Password reset' },
    400: { description: 'Invalid token' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/admin/users',
  summary: 'Create a new user with a temporary password',
  tags: ['Admin'],
  security: authSecurity,
  request: {
    body: {
      content: { 'application/json': { schema: adminCreateUserSchema } },
    },
  },
  responses: {
    201: { description: 'User created successfully' },
    400: { description: 'Bad request' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/me',
  summary: 'Get current authenticated user profile',
  tags: ['Auth'],
  security: authSecurity,
  responses: {
    200: { description: 'Current user profile' },
    401: { description: 'Unauthorized' },
  },
});

// ─── System Health Registrations ─────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/api/health',
  summary: 'System health check',
  description:
    'Returns the operational status of the service, current environment, and server timestamp.',
  tags: ['System'],
  responses: {
    200: {
      description: 'Service is healthy',
      content: {
        'application/json': {
          schema: z.object({
            status: z.string().openapi({ example: 'ok' }),
            service: z
              .string()
              .openapi({ example: 'Procurement Tracking System API' }),
            environment: z.string().openapi({ example: 'development' }),
            timestamp: z
              .string()
              .openapi({ example: new Date().toISOString() }),
          }),
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/',
  summary: 'Root service check',
  tags: ['System'],
  responses: {
    200: { description: 'Service is healthy' },
  },
});
