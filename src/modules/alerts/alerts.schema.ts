import { z } from 'zod';

export const alertsQuerySchema = z.object({
  region: z.string().optional(),
  role: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
});

export const createAlertSchema = z.object({
  userId: z.string().optional(),
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
    .optional(),
  title: z.string().trim().min(1, 'Title is required'),
  message: z.string().trim().min(1, 'Message is required'),
  type: z
    .enum([
      'PLAN_REVIEW',
      'CONTRACT_MILESTONE',
      'ACTIVITY_DEADLINE',
      'DECISION',
      'SYSTEM',
    ])
    .optional()
    .default('SYSTEM'),
  severity: z
    .enum(['HIGH', 'MEDIUM', 'LOW', 'INFO'])
    .optional()
    .default('INFO'),
  link: z.string().optional(),
});

export const updateAlertSchema = z.object({
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
});

export type AlertsQueryDto = z.infer<typeof alertsQuerySchema>;
export type CreateAlertDto = z.infer<typeof createAlertSchema>;
export type UpdateAlertDto = z.infer<typeof updateAlertSchema>;
