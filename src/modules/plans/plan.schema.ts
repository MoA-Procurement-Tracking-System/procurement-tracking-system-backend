import { z } from 'zod';
import { PlanStatus, VoteDecision } from '../../generated/prisma/index.js';

export const createPlanSchema = z.object({
  projectId: z.string().trim().min(1, 'Project ID is required'),
  title: z.string().trim().min(1, 'Title is required').max(255),
  budgetYear: z.string().trim().optional(),
  procurementCategory: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  description: z.string().trim().optional(),
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  gpnDate: z.coerce.date().optional(),
});

export const updatePlanSchema = z.object({
  title: z.string().trim().min(1).max(255).optional(),
  budgetYear: z.string().trim().optional(),
  procurementCategory: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  description: z.string().trim().optional(),
  periodStart: z.coerce.date().optional(),
  periodEnd: z.coerce.date().optional(),
  gpnDate: z.coerce.date().optional(),
  status: z.nativeEnum(PlanStatus).optional(),
});

export const rejectPlanSchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(1000),
});

export const committeeVoteSchema = z.object({
  decision: z.nativeEnum(VoteDecision),
  comment: z.string().trim().optional(),
});
