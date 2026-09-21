import { z } from 'zod';
import { registry } from '../../config/openapi.js';

// ─── Step 1: Key Details ──────────────────────────────────────────────────────

export const createActivityStep1Schema = z.object({
  planId: z.string().uuid('Plan ID must be a valid UUID'),
  reference: z.string().trim().max(255).optional(),
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
    .min(1, 'At least one funding source is required')
    .refine(
      (fundings) => {
        const hasPct = fundings.some((f) => f.allocationPct !== undefined);
        if (!hasPct) return true;
        const total = fundings.reduce(
          (sum, f) => sum + (f.allocationPct ?? 0),
          0,
        );
        return Math.abs(total - 100) < 0.01;
      },
      {
        message: 'Total funding allocation percentage must equal 100%',
        path: ['fundings'],
      },
    ),
  components: z.array(activityComponentSchema).optional(),
});

export const createActivityStep2Schema = step2BaseSchema.refine(
  (data) => {
    if (data.lotRequired) {
      return Array.isArray(data.lots) && data.lots.length > 0;
    }
    return true;
  },
  {
    message: 'At least one lot is required when Lot Required is enabled.',
    path: ['lots'],
  },
);

// ─── Step 3: Roadmap Template ────────────────────────────────────────────────

const customStageInputSchema = z.object({
  stageTypeId: z.string().uuid('Stage Type ID must be a valid UUID'),
  sequence: z.number().int().positive(),
  plannedStartDate: z.coerce.date().optional(),
  plannedEndDate: z.coerce.date().optional(),
  plannedDays: z.number().int().nonnegative().optional(),
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

export const createActivityStep3Schema = z.object({
  procurementClassificationCode: z.string().trim().max(100).optional(),
  procurementClassificationDesc: z.string().trim().max(500).optional(),
  location: z.string().trim().max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  roadmapTemplateId: z.string().uuid().optional(),
  customStages: z.array(customStageInputSchema).optional(),
});

const baseCreateActivitySchema = createActivityStep1Schema
  .extend(step2BaseSchema.shape)
  .extend(createActivityStep3Schema.shape)
  .extend({
    stages: z.array(stagePayloadItemSchema).optional(),
    roadmap: z.array(stagePayloadItemSchema).optional(),
  });

// ─── Complete Activity creation schema ────────────────────────────────────────

export const createActivitySchema = registry.register(
  'CreateActivity',
  baseCreateActivitySchema
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
    ),
);

export const updateActivitySchema = registry.register(
  'UpdateActivity',
  baseCreateActivitySchema.partial().omit({ planId: true }),
);

// ─── Step 4: Roadmap stage update ─────────────────────────────────────────────

export const updateStageSchema = registry.register(
  'UpdateStage',
  z.object({
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
  }),
);

export const updateStageActualSchema = registry.register(
  'UpdateStageActual',
  z.object({
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
  }),
);

export const replanStageSchema = registry.register(
  'ReplanStage',
  z.object({
    revisedStartDate: z.coerce.date({
      message: 'Revised start date is required',
    }),
    revisedEndDate: z.coerce.date().optional(),
    reason: z
      .string()
      .trim()
      .min(10, 'Reason must be at least 10 characters')
      .max(1000),
  }),
);

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

// Register OpenAPI Paths for Activities
registry.registerPath({
  method: 'get',
  path: '/api/activities',
  summary: 'List all active procurement activities',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: z.object({
      planId: z
        .string()
        .optional()
        .openapi({ description: 'Filter activities by plan ID' }),
    }),
  },
  responses: {
    200: { description: 'List of activities' },
    401: { description: 'Unauthorized' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/activities/{id}',
  summary: 'Get a procurement activity by ID',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Activity UUID' }),
    }),
  },
  responses: {
    200: { description: 'Activity found' },
    404: { description: 'Activity not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/activities',
  summary: 'Create a new procurement activity',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createActivitySchema } },
    },
  },
  responses: {
    201: { description: 'Activity created' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/activities/{id}',
  summary: 'Update an existing procurement activity',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Activity UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: updateActivitySchema } },
    },
  },
  responses: {
    200: { description: 'Activity updated' },
    400: { description: 'Validation error' },
    404: { description: 'Activity not found' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/activities/{id}/stages/{stageId}',
  summary: 'Update planning dates for a roadmap stage',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Activity UUID' }),
      stageId: z.string().openapi({ description: 'Stage UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: updateStageSchema } },
    },
  },
  responses: {
    200: { description: 'Stage updated' },
    404: { description: 'Activity or stage not found' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/activities/{id}/stages/{stageId}/actual',
  summary: 'Record actual dates for a completed roadmap stage',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Activity UUID' }),
      stageId: z.string().openapi({ description: 'Stage UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: updateStageActualSchema } },
    },
  },
  responses: {
    200: { description: 'Actual dates recorded' },
    404: { description: 'Activity or stage not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/activities/{id}/stages/{stageId}/replan',
  summary:
    'Replan a stage with a revised date and reason (creates revision record)',
  tags: ['Activities'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Activity UUID' }),
      stageId: z.string().openapi({ description: 'Stage UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: replanStageSchema } },
    },
  },
  responses: {
    200: { description: 'Stage replanned with revision history' },
    400: { description: 'Validation error' },
  },
});
