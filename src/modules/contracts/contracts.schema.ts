import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const createContractSchema = registry.register(
  'CreateContract',
  z.object({
    contractNo: z
      .string()
      .min(1, 'Contract number is required')
      .openapi({ example: 'MOA-2026-CTR-001' }),
    supplierId: z.string().optional().openapi({ example: 'sup-uuid-1' }),
    totalValue: z
      .number()
      .positive('Total value must be greater than 0')
      .openapi({ example: 250000 }),
    currency: z.string().optional().default('USD').openapi({ example: 'USD' }),
    region: z.string().optional().openapi({ example: 'Oromia' }),
    sector: z.string().optional().openapi({ example: 'Agriculture' }),
    isDeleted: z.boolean().optional(),
  }),
);

export const updateContractSchema = registry.register(
  'UpdateContract',
  createContractSchema.partial(),
);

export const getContractPaymentsQuerySchema = z.object({
  'filter[status]': z.enum(['PAID', 'PENDING', 'FAILED']).optional(),
});

export const createAmendmentSchema = registry.register(
  'CreateAmendment',
  z.object({
    amount: z
      .number()
      .refine((val) => val !== 0, 'Amendment amount cannot be zero')
      .openapi({
        example: 50000,
        description: 'Positive for addition, negative for reduction',
      }),
    reason: z
      .string()
      .trim()
      .min(1, 'Reason for amendment is required')
      .openapi({ example: 'Scope addition approved by project manager' }),
    referenceNo: z.string().trim().optional().openapi({ example: 'VAR-001' }),
    effectiveDate: z.coerce.date().optional(),
  }),
);

export type CreateAmendmentDto = z.infer<typeof createAmendmentSchema>;

export const createPaymentSchema = registry.register(
  'CreatePayment',
  z.object({
    amount: z
      .number()
      .positive('Payment amount must be greater than 0')
      .openapi({ example: 50000 }),
    referenceNo: z
      .string()
      .min(1, 'Reference number is required')
      .openapi({ example: 'REF-PAY-001' }),
    idempotencyKey: z
      .string()
      .min(1, 'Idempotency key is required')
      .openapi({ example: 'idemp-uuid-123' }),
    paymentDate: z.coerce.date().optional(),
  }),
);

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdateContractDto = z.infer<typeof updateContractSchema>;
export type GetContractPaymentsQueryDto = z.infer<
  typeof getContractPaymentsQuerySchema
>;

// Register OpenAPI Paths for Contracts
registry.registerPath({
  method: 'get',
  path: '/api/contracts',
  summary: 'Retrieve list of contracts',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: z.object({
      search: z
        .string()
        .optional()
        .openapi({ description: 'Search by contract number or sector' }),
      status: z.string().optional().openapi({
        description: 'Filter by status (ACTIVE, COMPLETED, CANCELLED, PENDING)',
      }),
    }),
  },
  responses: {
    200: { description: 'A list of contracts' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/contracts',
  summary: 'Create a new contract',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createContractSchema } },
    },
  },
  responses: {
    201: { description: 'Contract created successfully' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/contracts/{id}',
  summary: 'Get contract details by ID',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
  },
  responses: {
    200: { description: 'Contract details with supplier and payments' },
    404: { description: 'Contract not found' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/contracts/{id}',
  summary: 'Update contract details or soft-delete',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: updateContractSchema } },
    },
  },
  responses: {
    200: { description: 'Contract updated successfully' },
    404: { description: 'Contract not found' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/contracts/{id}/amendments',
  summary: 'Retrieve amendment history for a contract',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
  },
  responses: {
    200: { description: 'List of contract amendments' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/contracts/{id}/amendments',
  summary: 'Record an amendment (price addition or reduction) for a contract',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: createAmendmentSchema } },
    },
  },
  responses: {
    201: { description: 'Amendment recorded successfully' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/contracts/{id}/payments',
  summary: 'Retrieve payment history for a contract',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
    query: getContractPaymentsQuerySchema,
  },
  responses: {
    200: { description: 'List of contract payments' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/contracts/{id}/payments',
  summary: 'Record a payment for a contract',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Contract UUID' }),
    }),
    body: {
      content: { 'application/json': { schema: createPaymentSchema } },
    },
  },
  responses: {
    200: { description: 'Payment recorded successfully' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/contracts/template',
  summary: 'Export empty contracts spreadsheet template',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: {
      description: 'Excel template download',
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
  path: '/api/contracts/import',
  summary: 'Import contracts spreadsheet and update/insert records',
  tags: ['Contracts'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
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
