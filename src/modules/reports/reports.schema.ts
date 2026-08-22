import { z } from 'zod';

const pageParams = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(5000).default(500),
};

// ─── Report #7: Detailed Procurement ─────────────────────────────────────────
export const detailedProcurementSchema = z.object({
  planId: z.string().optional(),
  projectId: z.string().optional(),
  procurementMethodId: z.string().optional(),
  status: z.string().optional(),
  budgetYear: z.string().optional(),
  reviewType: z.string().optional(),
  ...pageParams,
});
export type DetailedProcurementQuery = z.infer<
  typeof detailedProcurementSchema
>;

// ─── Report #1: Annual Procurement Plan ──────────────────────────────────────
export const annualPlanSchema = z.object({
  budgetYear: z.string().min(1, 'budgetYear is required'),
  projectId: z.string().optional(),
  status: z.string().optional(),
  ...pageParams,
});
export type AnnualPlanQuery = z.infer<typeof annualPlanSchema>;

// ─── Report #3: Procurement Step ─────────────────────────────────────────────
export const procurementStepSchema = z.object({
  activityId: z.string().min(1, 'activityId is required'),
});
export type ProcurementStepQuery = z.infer<typeof procurementStepSchema>;

// ─── Report #2: Plan vs Actual ────────────────────────────────────────────────
export const planVsActualSchema = z.object({
  planId: z.string().optional(),
  projectId: z.string().optional(),
  budgetYear: z.string().optional(),
  ...pageParams,
});
export type PlanVsActualQuery = z.infer<typeof planVsActualSchema>;

// ─── Report #4: Delayed Procurement ──────────────────────────────────────────
export const delayedProcurementSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  ...pageParams,
});
export type DelayedProcurementQuery = z.infer<typeof delayedProcurementSchema>;

// ─── Report #6: Contract & Payment ───────────────────────────────────────────
export const contractPaymentSchema = z.object({
  region: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().optional(),
  ...pageParams,
});
export type ContractPaymentQuery = z.infer<typeof contractPaymentSchema>;

// ─── Report #5: Monthly Summary ──────────────────────────────────────────────
export const monthlySummarySchema = z.object({
  year: z.coerce.number().int().positive(),
  dateBasis: z.enum(['awarded', 'planned', 'completed']).default('awarded'),
  ...pageParams,
});
export type MonthlySummaryQuery = z.infer<typeof monthlySummarySchema>;

// ─── Report #8: Project & Officer Summary ────────────────────────────────────
export const projectOfficerSummarySchema = z.object({
  budgetYear: z.string().optional(),
  projectId: z.string().optional(),
  ...pageParams,
});
export type ProjectOfficerSummaryQuery = z.infer<
  typeof projectOfficerSummarySchema
>;
