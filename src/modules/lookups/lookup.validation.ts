import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const createLookupSchema = registry.register(
  'CreateLookup',
  z.object({
    type: z.string().trim().min(1).openapi({ example: 'CURRENCY' }),
    code: z.string().trim().min(1).openapi({ example: 'ETB' }),
    label: z.string().trim().min(1).openapi({ example: 'Ethiopian Birr' }),
  }),
);

export const updateLookupSchema = registry.register(
  'UpdateLookup',
  z
    .object({
      label: z
        .string()
        .trim()
        .min(1)
        .optional()
        .openapi({ example: 'Updated Label' }),
      isActive: z.boolean().optional().openapi({ example: true }),
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: 'At least one field required',
    }),
);

export const lookupIdParamSchema = z.object({
  id: z.uuid('Invalid lookup id').openapi({ description: 'Lookup UUID' }),
});

export const lookupTypeQuerySchema = z.object({
  type: z
    .string()
    .trim()
    .optional()
    .openapi({ description: 'Filter by lookup type', example: 'CURRENCY' }),
});

// Register OpenAPI Paths for Lookups
registry.registerPath({
  method: 'get',
  path: '/api/lookups',
  summary: 'List lookup values',
  tags: ['Lookups'],
  security: [{ bearerAuth: [] }],
  request: {
    query: lookupTypeQuerySchema,
  },
  responses: {
    200: { description: 'List of lookup values' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/lookups/{id}',
  summary: 'Get a lookup value by id',
  tags: ['Lookups'],
  security: [{ bearerAuth: [] }],
  request: {
    params: lookupIdParamSchema,
  },
  responses: {
    200: { description: 'Lookup value' },
    404: { description: 'Not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/lookups',
  summary: 'Create a lookup value',
  tags: ['Lookups'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: { 'application/json': { schema: createLookupSchema } },
    },
  },
  responses: {
    201: { description: 'Created' },
    409: { description: 'Conflict' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/lookups/{id}',
  summary: 'Update a lookup value',
  tags: ['Lookups'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: lookupIdParamSchema,
    body: {
      content: { 'application/json': { schema: updateLookupSchema } },
    },
  },
  responses: {
    200: { description: 'Updated' },
    404: { description: 'Not found' },
  },
});
