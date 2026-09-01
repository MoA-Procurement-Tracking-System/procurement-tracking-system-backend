import { z } from 'zod';

const pageParams = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(5000).default(500),
};

const dateRangeParams = {
  dateFrom: z
    .string()
    .datetime({ precision: 3 })
    .optional()
    .or(z.string().date().optional()),
  dateTo: z
    .string()
    .datetime({ precision: 3 })
    .optional()
    .or(z.string().date().optional()),
};

// ─── Report #1: Annual Procurement Plan ──────────────────────────────────────
export const annualPlanSchema = z.object({
  budgetYear: z.string().min(1, 'budgetYear is required'),
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  status: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...pageParams,
});
export type AnnualPlanQuery = z.infer<typeof annualPlanSchema>;

// ─── Report #2: Plan vs Actual ────────────────────────────────────────────────
export const planVsActualSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  fundingSourceId: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  performanceStatus: z.enum(['ON_TIME', 'DELAYED']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type PlanVsActualQuery = z.infer<typeof planVsActualSchema>;

// ─── Report #3: Procurement Step (STEP Tracker) ──────────────────────────────
export const procurementStepSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  activityStatus: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ProcurementStepQuery = z.infer<typeof procurementStepSchema>;

// ─── Report #4: Delayed Procurement ──────────────────────────────────────────
export const delayedProcurementSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  fundingSourceId: z.string().optional(),
  activityStatus: z.string().optional(),
  stageTypeId: z.string().optional(),
  minDelayDays: z.coerce.number().int().optional(),
  delayBucket: z.enum(['1-7', '8-30', '31-60', '60+']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type DelayedProcurementQuery = z.infer<typeof delayedProcurementSchema>;

// ─── Report #5: Monthly Summary ──────────────────────────────────────────────
export const monthlySummarySchema = z.object({
  year: z.coerce.number().int().positive(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  projectId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  ...pageParams,
});
export type MonthlySummaryQuery = z.infer<typeof monthlySummarySchema>;

// ─── Report #6: Contract & Payment ───────────────────────────────────────────
export const contractPaymentSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  activityId: z.string().optional(),
  supplierId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  contractStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  fundingSourceId: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ContractPaymentQuery = z.infer<typeof contractPaymentSchema>;

// ─── Report #7: Detailed Procurement ─────────────────────────────────────────
export const detailedProcurementSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  activityId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  region: z.string().optional(),
  officerId: z.string().optional(),
  supplierId: z.string().optional(),
  contractStatus: z.string().optional(),
  activityStatus: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type DetailedProcurementQuery = z.infer<
  typeof detailedProcurementSchema
>;

// ─── Report #8: Project & Officer Summary ────────────────────────────────────
export const projectOfficerSummarySchema = z.object({
  projectId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  status: z.string().optional(),
  ...pageParams,
});
export type ProjectOfficerSummaryQuery = z.infer<
  typeof projectOfficerSummarySchema
>;

// ─── Report #9: Activity Milestone Report ────────────────────────────────────
export const activityMilestoneSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  marketApproach: z.string().optional(),
  reviewType: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  activityStatus: z.string().optional(),
  contractStatus: z.string().optional(),
  supplierId: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ActivityMilestoneQuery = z.infer<typeof activityMilestoneSchema>;
