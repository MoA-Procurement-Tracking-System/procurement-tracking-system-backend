import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  region: z.string().optional(),
});

export const dashboardByActivityQuerySchema = z.object({
  region: z.string().optional(),
});
