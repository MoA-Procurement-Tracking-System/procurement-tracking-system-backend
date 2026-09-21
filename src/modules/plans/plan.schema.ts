import { z } from 'zod';
import { PlanStatus, VoteDecision } from '../../generated/prisma/index.js';
import { registry } from '../../config/openapi.js';

export const createPlanSchema = registry.register(
  'CreatePlan',
  z.object({
    projectId: z
      .string()
      .trim()
      .min(1, 'Project ID is required')
      .openapi({ example: 'proj-uuid-1' }),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(255)
      .openapi({ example: 'Annual Procurement Plan 2026' }),
    budgetYear: z.string().trim().optional().openapi({ example: '2026' }),
    procurementCategory: z
      .string()
      .trim()
      .optional()
      .openapi({ example: 'GOODS' }),
    organization: z
      .string()
      .trim()
      .optional()
      .openapi({ example: 'Ministry of Agriculture' }),
    description: z.string().trim().optional(),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    gpnDate: z.coerce.date().optional(),
    parentPlanId: z.string().trim().optional(),
    planType: z.string().trim().optional(),
    additionalPlanReason: z.string().trim().optional(),
  })
  .refine((data) => data.periodEnd >= data.periodStart, {
    message: 'Period end date must be on or after period start date',
    path: ['periodEnd'],
  }),
);

export const updatePlanSchema = registry.register(
  'UpdatePlan',
  z
    .object({
      title: z.string().trim().min(1).max(255).optional(),
      budgetYear: z.string().trim().optional(),
      procurementCategory: z.string().trim().optional(),
      organization: z.string().trim().optional(),
      description: z.string().trim().optional(),
      periodStart: z.coerce.date().optional(),
      periodEnd: z.coerce.date().optional(),
      gpnDate: z.coerce.date().optional(),
      status: z.nativeEnum(PlanStatus).optional(),
      parentPlanId: z.string().trim().optional(),
      planType: z.string().trim().optional(),
      additionalPlanReason: z.string().trim().optional(),
    })
    .refine(
      (data) => {
        if (data.periodStart && data.periodEnd) {
          return data.periodEnd >= data.periodStart;
        }
        return true;
      },
      {
        message: 'Period end date must be on or after period start date',
        path: ['periodEnd'],
      },
    ),
);

export const rejectPlanSchema = registry.register(
  'RejectPlan',
  z
    .object({
      reason: z
        .string()
        .trim()
        .min(1, 'Rejection reason is required')
        .max(1000)
        .optional(),
      comment: z.string().trim().min(1).max(1000).optional(),
    })
    .refine(
      (data) =>
        Boolean(
          (data.reason && data.reason.trim()) ||
          (data.comment && data.comment.trim()),
        ),
      {
        message: 'Rejection reason is required',
      },
    ),
);

export const returnToOfficerSchema = registry.register(
  'ReturnToOfficer',
  z.object({
    comment: z.string().trim().optional(),
    reason: z.string().trim().optional(),
    userId: z.string().trim().optional(),
  }),
);

export const committeeVoteSchema = registry.register(
  'CommitteeVote',
  z.object({
    decision: z
      .nativeEnum(VoteDecision)
      .openapi({ example: VoteDecision.APPROVE }),
    comment: z
      .string()
      .trim()
      .optional()
      .openapi({ example: 'All specifications meet ministry criteria.' }),
  }),
);

export const managementDecisionSchema = registry.register(
  'ManagementDecision',
  z.object({
    decision: z.enum(['APPROVE', 'REJECT']).openapi({ example: 'APPROVE' }),
    comment: z
      .string()
      .trim()
      .optional()
      .openapi({ example: 'Authorized by Executive Management' }),
  }),
);

export const sendToCommitteeSchema = z.object({
  voteDeadlineHours: z
    .number()
    .optional()
    .openapi({ example: 48, description: 'Hours until voting deadline' }),
});

// Register OpenAPI Paths for Plans
registry.registerPath({
  method: 'get',
  path: '/api/plans',
  summary: 'List all active procurement plans',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: { description: 'List of plans' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/plans/{id}',
  summary: 'Get a procurement plan by ID',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
  },
  responses: {
    200: { description: 'Plan found' },
    404: { description: 'Plan not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans',
  summary: 'Create a new procurement plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createPlanSchema } },
    },
  },
  responses: {
    201: { description: 'Plan created' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/plans/{id}',
  summary: 'Update an existing procurement plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
    body: {
      content: { 'application/json': { schema: updatePlanSchema } },
    },
  },
  responses: {
    200: { description: 'Plan updated' },
    404: { description: 'Plan not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/request-update',
  summary: 'Request permission to update an approved plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
  },
  responses: {
    200: { description: 'Update requested' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/approve-update',
  summary: 'Approve a request to update a plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
  },
  responses: {
    200: { description: 'Update approved' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/submit',
  summary: 'Submit a draft plan for review',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
  },
  responses: {
    200: { description: 'Plan submitted' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/send-to-committee',
  summary: 'Send a submitted plan to the endorsing committee',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
    body: {
      content: { 'application/json': { schema: sendToCommitteeSchema } },
    },
  },
  responses: {
    200: { description: 'Plan sent to committee, emails dispatched' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/return-to-officer',
  summary: 'Return a plan to the procurement officer for revision',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
    body: {
      content: { 'application/json': { schema: returnToOfficerSchema } },
    },
  },
  responses: {
    200: { description: 'Plan returned for revision' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/reject',
  summary: 'Reject a submitted plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
    body: {
      content: { 'application/json': { schema: rejectPlanSchema } },
    },
  },
  responses: {
    200: { description: 'Plan rejected' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/plans/{id}/vote',
  summary: 'Cast a committee vote on a plan',
  tags: ['Plans'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string().openapi({ description: 'Plan UUID' }) }),
    body: {
      content: { 'application/json': { schema: committeeVoteSchema } },
    },
  },
  responses: {
    200: { description: 'Vote recorded' },
  },
});
