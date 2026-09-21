import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const auditLogQuerySchema = registry.register(
  'AuditLogQuery',
  z.object({
    page: z.coerce.number().int().min(1).default(1).openapi({ example: 1 }),
    pageSize: z.coerce
      .number()
      .int()
      .min(1)
      .max(100)
      .default(25)
      .openapi({ example: 25 }),
    userId: z
      .string()
      .optional()
      .openapi({ description: 'Filter by user UUID' }),
    entityType: z.string().trim().optional().openapi({ example: 'Activity' }),
    entityId: z
      .string()
      .trim()
      .optional()
      .openapi({ description: 'Filter by entity UUID' }),
    action: z.string().trim().optional().openapi({ example: 'UPDATE' }),
    search: z
      .string()
      .trim()
      .optional()
      .openapi({ description: 'Keyword search' }),
  }),
);

export type AuditLogQueryDto = z.infer<typeof auditLogQuerySchema>;

registry.registerPath({
  method: 'get',
  path: '/api/audit-logs',
  summary: 'List audit logs',
  tags: ['Audit Logs'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: auditLogQuerySchema,
  },
  responses: {
    200: { description: 'Paginated audit logs' },
    403: { description: 'Admin only' },
  },
});
