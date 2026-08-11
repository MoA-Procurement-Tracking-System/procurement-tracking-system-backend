import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  region: z.string().optional(),
});

export const dashboardBySectorQuerySchema = z.object({
  region: z.string().optional(),
});

export type DashboardSummaryQueryDto = z.infer<typeof dashboardSummaryQuerySchema>;
export type DashboardBySectorQueryDto = z.infer<typeof dashboardBySectorQuerySchema>;