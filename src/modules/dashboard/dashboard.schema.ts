import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const dashboardSummaryQuerySchema = z.object({
  region: z
    .string()
    .optional()
    .openapi({ description: 'Optional region filter', example: 'Oromia' }),
});

export const dashboardBySectorQuerySchema = z.object({
  region: z
    .string()
    .optional()
    .openapi({ description: 'Optional region filter', example: 'Oromia' }),
});

export type DashboardSummaryQueryDto = z.infer<
  typeof dashboardSummaryQuerySchema
>;
export type DashboardBySectorQueryDto = z.infer<
  typeof dashboardBySectorQuerySchema
>;

registry.registerPath({
  method: 'get',
  path: '/api/dashboard/summary',
  summary: 'Get high-level financial summary metrics',
  tags: ['Dashboard'],
  request: {
    query: dashboardSummaryQuerySchema,
  },
  responses: {
    200: {
      description: 'Dashboard financial aggregates and active contract count',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/dashboard/by-sector',
  summary: 'Get funding metrics grouped by sector',
  tags: ['Dashboard'],
  request: {
    query: dashboardBySectorQuerySchema,
  },
  responses: {
    200: { description: 'Array of sector funding breakdowns' },
  },
});
