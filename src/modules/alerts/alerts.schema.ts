import { z } from 'zod';

export const alertsQuerySchema = z.object({
  region: z.string().optional(),
});

export type AlertsQueryDto = z.infer<typeof alertsQuerySchema>;