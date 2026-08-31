import { z } from 'zod';

// ─── Step 1: Key Details ──────────────────────────────────────────────────────

export const createActivityStep1Schema = z.object({
  planId: z.string().uuid('Plan ID must be a valid UUID'),
  procurementMethodId: z.string().uuid('Procurement Method is required'),
  specificMethod: z.string().trim().max(255).optional(),
  marketApproach: z
    .enum(['OPEN_INTERNATIONAL', 'OPEN_NATIONAL', 'LIMITED', 'DIRECT'])
    .optional(),
  qualificationApproach: z
    .enum(['PREQUALIFICATION', 'POST_QUALIFICATION', 'NOT_APPLICABLE'])
    .optional(),
  domesticPreference: z.boolean().optional(),
  reviewType: z.enum(['PRIOR', 'POST']).optional(),
  oversightClassification: z.string().trim().max(100).optional(),
  procurementProcess: z.string().trim().max(255).optional(),
  evaluationOptions: z.array(z.string()).optional(),
  highSeaShRisk: z.boolean().optional(),
  procurementDocumentType: z.string().trim().max(255).optional(),
  contractType: z.enum(['LUMP_SUM', 'TIME_BASED']).optional(),
  requiresUnAgencyContracting: z.boolean().optional(),
  isImport: z.boolean().default(false),
});

// ─── Step 2: Related Information ─────────────────────────────────────────────

const activityLotSchema = z.object({
  lotNumber: z.string().trim().min(1),
  description: z.string().trim().max(500).optional(),
  estimatedAmount: z.number().nonnegative().optional(),
});

const activityFundingSchema = z.object({
  fundingSource: z.string().trim().min(1, 'Funding source is required'),
  loanGrantNumber: z.string().trim().max(100).optional(),
  allocationPct: z.number().min(0).max(100).optional(),
});

const activityComponentSchema = z.object({
  component: z.string().trim().min(1, 'Component is required'),
  subcomponent: z.string().trim().max(255).optional(),
  allocationPct: z.number().min(0).max(100).optional(),
});

const step2BaseSchema = z.object({
  description: z.string().trim().min(1, 'Description is required'),
  estimatedBudget: z
    .number()
    .nonnegative('Estimated budget must be zero or positive'),
  currency: z.string().trim().min(1, 'Currency is required').max(10),
  bidReferenceNo: z.string().trim().max(100).optional(),
  pricingBasis: z.enum(['LUMP_SUM', 'BOQ']).optional(),
  scopeNotes: z.string().trim().max(2000).optional(),
  remarks: z.string().trim().max(2000).optional(),
  lotRequired: z.boolean().default(false),
  lots: z.array(activityLotSchema).optional(),
  fundings: z
    .array(activityFundingSchema)
    .min(1, 'At least one funding source is required'),
  components: z.array(activityComponentSchema).optional(),
});

export const createActivityStep2Schema = step2BaseSchema
  .refine(
    (data) => {
      if (!data.fundings || data.fundings.length <= 1) return true;
      const total = data.fundings.reduce(
        (sum, f) => sum + (f.allocationPct ?? 0),
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    {
      message:
        'Funding allocations must total 100% when multiple sources are used.',
      path: ['fundings'],
    },
  )
  .refine(
    (data) => {
      if (!data.components || data.components.length <= 1) return true;
      const total = data.components.reduce(
        (sum, c) => sum + (c.allocationPct ?? 0),
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    {
      message:
        'Component allocations must total 100% when multiple components are used.',
      path: ['components'],
    },
  )
  .refine(
    (data) => {
      if (!data.lotRequired) return true;
      return Boolean(data.lots && data.lots.length > 0);
    },
    {
      message: 'At least one lot is required when Lot Required is enabled.',
      path: ['lots'],
    },
  );

// ─── Step 3: Additional Details ───────────────────────────────────────────────

export const createActivityStep3Schema = z.object({
  procurementClassificationCode: z.string().trim().max(100).optional(),
  procurementClassificationDesc: z.string().trim().max(500).optional(),
  location: z.string().trim().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const stagePayloadItemSchema = z.object({
  name: z.string().optional(),
  stageTypeId: z.string().optional(),
  sequence: z.number().optional(),
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  currentTargetStartDate: z.coerce.date().optional(),
  currentTargetEndDate: z.coerce.date().optional(),
  plannedDays: z.number().optional(),
  isNotApplicable: z.boolean().optional(),
  notApplicable: z.boolean().optional(),
  gregorianDate: z.string().optional(),
  ethiopianDate: z.string().optional(),
  status: z.string().optional(),
  remarks: z.string().optional(),
});

// ─── Full create schema & update schema ───────────────────────────────────────

const baseCreateActivitySchema = createActivityStep1Schema
  .extend(step2BaseSchema.shape)
  .extend(createActivityStep3Schema.shape)
  .extend({
    stages: z.array(stagePayloadItemSchema).optional(),
    roadmap: z.array(stagePayloadItemSchema).optional(),
  });

export const createActivitySchema = baseCreateActivitySchema
  .refine(
    (data) => {
      if (!data.fundings || data.fundings.length <= 1) return true;
      const total = data.fundings.reduce(
        (sum, f) => sum + (f.allocationPct ?? 0),
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    {
      message:
        'Funding allocations must total 100% when multiple sources are used.',
      path: ['fundings'],
    },
  )
  .refine(
    (data) => {
      if (!data.components || data.components.length <= 1) return true;
      const total = data.components.reduce(
        (sum, c) => sum + (c.allocationPct ?? 0),
        0,
      );
      return Math.abs(total - 100) < 0.01;
    },
    {
      message:
        'Component allocations must total 100% when multiple components are used.',
      path: ['components'],
    },
  )
  .refine(
    (data) => {
      if (!data.lotRequired) return true;
      return Boolean(data.lots && data.lots.length > 0);
    },
    {
      message: 'At least one lot is required when Lot Required is enabled.',
      path: ['lots'],
    },
  );

export const updateActivitySchema = createActivityStep1Schema
  .extend(step2BaseSchema.shape)
  .extend(createActivityStep3Schema.shape)
  .partial()
  .omit({ planId: true });

// ─── Step 4: Roadmap stage update ─────────────────────────────────────────────

export const updateStageSchema = z.object({
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  currentTargetStartDate: z.coerce.date().optional(),
  currentTargetEndDate: z.coerce.date().optional(),
  plannedDays: z.number().int().nonnegative().optional(),
  isNotApplicable: z.boolean().optional(),
  status: z
    .enum([
      'NOT_STARTED',
      'IN_PROGRESS',
      'COMPLETED',
      'DELAYED',
      'NOT_APPLICABLE',
    ])
    .optional(),
  remarks: z.string().trim().max(2000).optional(),
});

export const updateStageActualSchema = z.object({
  actualStartDate: z.coerce.date().optional(),
  actualEndDate: z.coerce.date().optional(),
  status: z
    .enum([
      'NOT_STARTED',
      'IN_PROGRESS',
      'COMPLETED',
      'DELAYED',
      'NOT_APPLICABLE',
    ])
    .optional(),
  remarks: z.string().trim().max(2000).optional(),
});

export const replanStageSchema = z.object({
  revisedStartDate: z.coerce.date({
    message: 'Revised start date is required',
  }),
  revisedEndDate: z.coerce.date().optional(),
  reason: z
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000),
});

export type CreateActivityStep1Input = z.infer<
  typeof createActivityStep1Schema
>;
export type CreateActivityStep2Input = z.infer<
  typeof createActivityStep2Schema
>;
export type CreateActivityStep3Input = z.infer<
  typeof createActivityStep3Schema
>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type UpdateStageActualInput = z.infer<typeof updateStageActualSchema>;
export type ReplanStageInput = z.infer<typeof replanStageSchema>;
