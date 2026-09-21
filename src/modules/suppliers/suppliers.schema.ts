import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const createSupplierSchema = registry.register(
  'CreateSupplier',
  z.object({
    name: z
      .string()
      .min(2, 'Supplier name is required')
      .openapi({ example: 'Global Tech PLC' }),
    tinNumber: z
      .string()
      .min(5, 'Valid TIN number is required')
      .openapi({ example: '0012345678' }),
    email: z
      .string()
      .email('Invalid email address')
      .optional()
      .openapi({ example: 'vendor@globaltech.et' }),
    phone: z.string().optional().openapi({ example: '+251911223344' }),
    address: z
      .string()
      .optional()
      .openapi({ example: 'Addis Ababa, Ethiopia' }),
    status: z
      .enum(['ACTIVE', 'INACTIVE'])
      .optional()
      .default('ACTIVE')
      .openapi({ example: 'ACTIVE' }),
  }),
);

export const getSuppliersQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .openapi({ description: 'Search suppliers by name or TIN number' }),
  'filter[status]': z
    .enum(['ACTIVE', 'INACTIVE'])
    .optional()
    .openapi({ description: 'Filter suppliers by status' }),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10)),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type GetSuppliersQueryDto = z.infer<typeof getSuppliersQuerySchema>;

// Register OpenAPI Paths
registry.registerPath({
  method: 'get',
  path: '/api/suppliers',
  summary: 'Retrieve list of suppliers',
  tags: ['Suppliers'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    query: getSuppliersQuerySchema,
  },
  responses: {
    200: {
      description: 'A paginated list of suppliers',
    },
    400: {
      description: 'Invalid query parameters',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/suppliers',
  summary: 'Register a new supplier',
  tags: ['Suppliers'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSupplierSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Supplier registered successfully',
    },
    400: {
      description: 'Validation error',
    },
  },
});
