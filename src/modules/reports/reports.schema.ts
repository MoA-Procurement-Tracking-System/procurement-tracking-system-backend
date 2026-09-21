import { z } from 'zod';
import { registry } from '../../config/openapi.js';

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

// ─── Report #1: Annual Procurement Plan (P0) ──────────────────────────────────
export const annualPlanSchema = z.object({
  budgetYear: z.string().optional(),
  fiscalYear: z.string().optional(),
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  fundingType: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  officerId: z.string().optional(),
  status: z.string().optional(),
  currency: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...pageParams,
});
export type AnnualPlanQuery = z.infer<typeof annualPlanSchema>;

// ─── Report #2: Plan vs Actual Progress (P0) ──────────────────────────────────
export const planVsActualSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  budgetYear: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  fundingSourceId: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  status: z.string().optional(),
  performanceStatus: z.enum(['ON_TIME', 'DELAYED']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type PlanVsActualQuery = z.infer<typeof planVsActualSchema>;

// ─── Report #3: Procurement Step Report (P0) ──────────────────────────────────
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
  status: z.string().optional(),
  stageTypeId: z.string().optional(),
  stageStatus: z.string().optional(),
  currency: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ProcurementStepQuery = z.infer<typeof procurementStepSchema>;

// ─── Report #4: Delayed Procurement Report (P0) ───────────────────────────────
export const delayedProcurementSchema = z.object({
  budgetYear: z.string().optional(),
  fiscalYear: z.string().optional(),
  projectId: z.string().optional(),
  planId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  officerId: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  fundingSourceId: z.string().optional(),
  activityStatus: z.string().optional(),
  status: z.string().optional(),
  stageTypeId: z.string().optional(),
  minDelayDays: z.coerce.number().int().optional(),
  delayBucket: z.enum(['1-7', '8-30', '31-60', '60+']).optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type DelayedProcurementQuery = z.infer<typeof delayedProcurementSchema>;

// ─── Report #5: Monthly Procurement Report (P0) ───────────────────────────────
export const monthlyProcurementSchema = z.object({
  year: z.coerce.number().int().positive().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  budgetYear: z.string().optional(),
  fiscalYear: z.string().optional(),
  projectId: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  status: z.string().optional(),
  ...pageParams,
});
export type MonthlyProcurementQuery = z.infer<typeof monthlyProcurementSchema>;

// Legacy alias for monthly summary query
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

// ─── Report #6: Quarterly Procurement Summary (P0) ────────────────────────────
export const quarterlySummarySchema = z.object({
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  periodType: z
    .enum(['QUARTER', 'SIX_MONTH', 'SEVEN_MONTH', 'ANNUAL'])
    .optional(),
  year: z.coerce.number().int().positive().optional(),
  fiscalYear: z.string().optional(),
  budgetYear: z.string().optional(),
  projectId: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  fundingSourceId: z.string().optional(),
  fundingType: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  ...pageParams,
});
export type QuarterlySummaryQuery = z.infer<typeof quarterlySummarySchema>;

// ─── Report #7: Quarterly Detailed Procurement Report (P1) ────────────────────
export const quarterlyDetailedSchema = z.object({
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  period: z.string().optional(),
  year: z.coerce.number().int().positive().optional(),
  fiscalYear: z.string().optional(),
  projectId: z.string().optional(),
  planId: z.string().optional(),
  region: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  officerId: z.string().optional(),
  supplierId: z.string().optional(),
  contractStatus: z.string().optional(),
  activityStatus: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type QuarterlyDetailedQuery = z.infer<typeof quarterlyDetailedSchema>;

// Legacy alias
export const detailedProcurementSchema = quarterlyDetailedSchema;
export type DetailedProcurementQuery = z.infer<
  typeof detailedProcurementSchema
>;

// ─── Report #8: Contract Register (P0) ────────────────────────────────────────
export const contractRegisterSchema = z.object({
  projectId: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  supplierId: z.string().optional(),
  officerId: z.string().optional(),
  currency: z.string().optional(),
  contractStatus: z.string().optional(),
  methodId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ContractRegisterQuery = z.infer<typeof contractRegisterSchema>;

// ─── Report #9: Contract & Payment Status Report (P0) ─────────────────────────
export const contractPaymentSchema = z.object({
  projectId: z.string().optional(),
  planId: z.string().optional(),
  activityId: z.string().optional(),
  supplierId: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  officerId: z.string().optional(),
  contractStatus: z.string().optional(),
  paymentStatus: z.string().optional(),
  fundingSourceId: z.string().optional(),
  currency: z.string().optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type ContractPaymentQuery = z.infer<typeof contractPaymentSchema>;

// ─── Report #10: Regional / Sector Summary (P0) ───────────────────────────────
export const regionalSectorSummarySchema = z.object({
  fiscalYear: z.string().optional(),
  budgetYear: z.string().optional(),
  groupBy: z.enum(['REGION', 'SECTOR', 'ORGANIZATION']).default('REGION'),
  projectId: z.string().optional(),
  fundingSourceId: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  currency: z.string().optional(),
  ...pageParams,
});
export type RegionalSectorSummaryQuery = z.infer<
  typeof regionalSectorSummarySchema
>;

// ─── Report #11: Project Summary (P0) ─────────────────────────────────────────
export const projectSummarySchema = z.object({
  fiscalYear: z.string().optional(),
  budgetYear: z.string().optional(),
  projectId: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  fundingSourceId: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  status: z.string().optional(),
  currency: z.string().optional(),
  ...pageParams,
});
export type ProjectSummaryQuery = z.infer<typeof projectSummarySchema>;

// ─── Report #12: Officer Summary (P0) ─────────────────────────────────────────
export const officerSummarySchema = z.object({
  fiscalYear: z.string().optional(),
  budgetYear: z.string().optional(),
  officerId: z.string().optional(),
  projectId: z.string().optional(),
  sector: z.string().optional(),
  region: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  methodId: z.string().optional(),
  currency: z.string().optional(),
  ...pageParams,
});
export type OfficerSummaryQuery = z.infer<typeof officerSummarySchema>;

// Legacy alias
export const projectOfficerSummarySchema = officerSummarySchema;
export type ProjectOfficerSummaryQuery = z.infer<
  typeof projectOfficerSummarySchema
>;

// ─── Report #13: Committee / Approval Progress Report (P0) ────────────────────
export const committeeApprovalSchema = z.object({
  fiscalYear: z.string().optional(),
  budgetYear: z.string().optional(),
  projectId: z.string().optional(),
  officerId: z.string().optional(),
  planStatus: z.string().optional(),
  directorDecision: z.string().optional(),
  committeeResult: z.string().optional(),
  managementDecision: z.string().optional(),
  ...pageParams,
});
export type CommitteeApprovalQuery = z.infer<typeof committeeApprovalSchema>;

// ─── Report #14: Supplier Performance (P1) ────────────────────────────────────
export const supplierPerformanceSchema = z.object({
  supplierId: z.string().optional(),
  region: z.string().optional(),
  sector: z.string().optional(),
  contractStatus: z.string().optional(),
  currency: z.string().optional(),
  ...dateRangeParams,
  ...pageParams,
});
export type SupplierPerformanceQuery = z.infer<
  typeof supplierPerformanceSchema
>;

// Legacy alias
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

// ─── Register OpenAPI Paths for Reports ──────────────────────────────────────
const security = [{ bearerAuth: [] }, { cookieAuth: [] }];

registry.registerPath({
  method: 'get',
  path: '/api/reports/detailed-procurement',
  summary: 'Report #7 — Detailed Procurement (Excel)',
  tags: ['Reports'],
  security,
  request: { query: detailedProcurementSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/annual-procurement-plan',
  summary: 'Report #1 — Annual Procurement Plan (Excel)',
  tags: ['Reports'],
  security,
  request: { query: annualPlanSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/procurement-steps',
  summary: 'Report #3 — Procurement Step (STEP Tracker)',
  tags: ['Reports'],
  security,
  request: { query: procurementStepSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/plan-vs-actual',
  summary: 'Report #2 — Plan vs Actual comparison (Excel)',
  tags: ['Reports'],
  security,
  request: { query: planVsActualSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/delayed-procurement',
  summary: 'Report #4 — Delayed Procurement (Excel)',
  tags: ['Reports'],
  security,
  request: { query: delayedProcurementSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/contract-payment',
  summary: 'Report #6 — Contract & Payment (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: contractPaymentSchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/monthly-summary',
  summary: 'Report #5 — Monthly Summary (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: monthlySummarySchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/project-officer-summary',
  summary: 'Report #8 — Project & Officer Summary (Excel) — Director only',
  tags: ['Reports'],
  security,
  request: { query: projectOfficerSummarySchema },
  responses: {
    200: {
      description: 'Excel file download',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
    403: { description: 'Director access required' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/reports/activity-milestone',
  summary: 'Report #9 — Activity Milestone Report (Excel)',
  description:
    'One row per Activity. Fixed identity columns followed by dynamic Planned/Actual date column pairs for each procurement stage milestone.',
  tags: ['Reports'],
  security,
  request: { query: activityMilestoneSchema },
  responses: {
    200: {
      description: 'Excel file download (.xlsx)',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/reports/import/contracts',
  summary: 'Import contract report spreadsheet from local disk',
  tags: ['Reports'],
  security,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: z.object({
            file: z.string().openapi({ type: 'string', format: 'binary' }),
          }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Success response with import counts' },
    400: { description: 'Import parsing or validation error' },
  },
});
