import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const alertsQuerySchema = z.object({
  region: z
    .string()
    .optional()
    .openapi({ description: 'Filter alerts by geographical region' }),
  role: z.string().optional().openapi({ description: 'Filter alerts by role' }),
  unreadOnly: z.coerce
    .boolean()
    .optional()
    .openapi({ description: 'If true, only returns unread alerts' }),
});

export const createAlertSchema = registry.register(
  'CreateAlert',
  z.object({
    userId: z
      .string()
      .optional()
      .openapi({ description: 'Target user ID if alert is specific' }),
    targetRole: z
      .enum([
        'OFFICER',
        'DIRECTOR',
        'ENDORSING_COMMITTEE',
        'MANAGEMENT',
        'MANAGEMENT_TEAM',
        'ADMIN',
        'ALL',
      ])
      .optional()
      .openapi({ example: 'OFFICER' }),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .openapi({ example: 'Plan Submitted for Review' }),
    message: z
      .string()
      .trim()
      .min(1, 'Message is required')
      .openapi({ example: 'Annual Procurement Plan 2026 has been submitted.' }),
    type: z
      .enum([
        'PLAN_REVIEW',
        'CONTRACT_MILESTONE',
        'ACTIVITY_DEADLINE',
        'DECISION',
        'SYSTEM',
      ])
      .optional()
      .default('SYSTEM')
      .openapi({ example: 'PLAN_REVIEW' }),
    severity: z
      .enum(['HIGH', 'MEDIUM', 'LOW', 'INFO'])
      .optional()
      .default('INFO')
      .openapi({ example: 'INFO' }),
    link: z.string().optional().openapi({ example: '/plans/plan-123' }),
  }),
);

export const updateAlertSchema = registry.register(
  'UpdateAlert',
  z.object({
    title: z.string().trim().min(1).optional(),
    message: z.string().trim().min(1).optional(),
    type: z
      .enum([
        'PLAN_REVIEW',
        'CONTRACT_MILESTONE',
        'ACTIVITY_DEADLINE',
        'DECISION',
        'SYSTEM',
      ])
      .optional(),
    severity: z.enum(['HIGH', 'MEDIUM', 'LOW', 'INFO']).optional(),
    link: z.string().optional(),
    readAt: z.union([z.string().datetime(), z.null()]).optional(),
  }),
);

export type AlertsQueryDto = z.infer<typeof alertsQuerySchema>;
export type CreateAlertDto = z.infer<typeof createAlertSchema>;
export type UpdateAlertDto = z.infer<typeof updateAlertSchema>;

// Register OpenAPI Paths for Alerts
registry.registerPath({
  method: 'get',
  path: '/api/alerts',
  summary: 'Retrieve alerts matching the authenticated user or role',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: alertsQuerySchema,
  },
  responses: {
    200: {
      description: 'Array of alerts',
    },
    400: {
      description: 'Invalid query parameters',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/alerts',
  summary: 'Create a new system or targeted alert',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createAlertSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Alert created successfully',
    },
    400: {
      description: 'Validation error',
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/alerts/read-all',
  summary: 'Mark all alerts as read for the authenticated user',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: 'All alerts marked as read',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/alerts/{id}',
  summary: 'Get alert details by ID',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Alert UUID' }) }),
  },
  responses: {
    200: {
      description: 'Alert found',
    },
    404: {
      description: 'Alert not found',
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/alerts/{id}',
  summary: 'Update an alert details or read timestamp',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Alert UUID' }) }),
    body: {
      content: {
        'application/json': {
          schema: updateAlertSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Alert updated successfully',
    },
    404: {
      description: 'Alert not found',
    },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/alerts/{id}/read',
  summary: 'Mark a single alert as read',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Alert UUID' }) }),
  },
  responses: {
    200: {
      description: 'Alert marked as read',
    },
    404: {
      description: 'Alert not found',
    },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/alerts/{id}',
  summary: 'Delete/dismiss an alert by ID',
  tags: ['Alerts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Alert UUID' }) }),
  },
  responses: {
    200: {
      description: 'Alert dismissed/deleted successfully',
    },
    404: {
      description: 'Alert not found',
    },
  },
});
