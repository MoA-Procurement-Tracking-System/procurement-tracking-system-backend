import { z } from 'zod';
import { registry } from '../../config/openapi.js';

export const uploadBodySchema = registry.register(
  'DocumentUploadBody',
  z.object({
    file: z.string().openapi({ type: 'string', format: 'binary' }),
    entityType: z.string().trim().min(1).openapi({ example: 'Activity' }),
    entityId: z.string().trim().min(1).openapi({ example: 'act-uuid-1' }),
    title: z.string().trim().min(1).openapi({ example: 'Tender Document' }),
    type: z.string().trim().min(1).openapi({ example: 'SPECIFICATION' }),
  }),
);

export const listDocumentsQuerySchema = z.object({
  entityType: z.string().trim().min(1).openapi({ example: 'Activity' }),
  entityId: z.string().trim().min(1).openapi({ example: 'act-uuid-1' }),
});

export const documentIdParamSchema = z.object({
  id: z.string().openapi({ description: 'Document ID' }),
});

export type UploadDocumentBodyDto = z.infer<typeof uploadBodySchema>;
export type ListDocumentsQueryDto = z.infer<typeof listDocumentsQuerySchema>;

const security = [{ bearerAuth: [] }, { cookieAuth: [] }];

registry.registerPath({
  method: 'post',
  path: '/api/documents',
  summary: 'Upload a document',
  tags: ['Documents'],
  security,
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: uploadBodySchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Document uploaded' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/documents',
  summary: 'List documents for an entity',
  tags: ['Documents'],
  security,
  request: {
    query: listDocumentsQuerySchema,
  },
  responses: {
    200: { description: 'List of documents' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/documents/{id}/download',
  summary: 'Download a document',
  tags: ['Documents'],
  security,
  request: {
    params: documentIdParamSchema,
  },
  responses: {
    200: { description: 'File stream' },
    404: { description: 'Not found' },
  },
});
