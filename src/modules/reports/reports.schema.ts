import { z } from 'zod';

export const reportQuerySchema = z.object({
  region: z.string().optional(),
});

export type ReportQueryDto = z.infer<typeof reportQuerySchema>;