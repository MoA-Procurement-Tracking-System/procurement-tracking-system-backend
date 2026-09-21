import { z } from 'zod';
import { registry } from '../../config/openapi.js';

const fileUploadSchema = registry.register(
  'ExcelFileUpload',
  z.object({
    file: z.string().openapi({ type: 'string', format: 'binary' }),
  }),
);

const security = [{ bearerAuth: [] }, { cookieAuth: [] }];

const templates = [
  {
    path: '/api/excel/templates/projects',
    summary: 'Export empty projects spreadsheet template with validations',
  },
  {
    path: '/api/excel/templates/plans',
    summary: 'Export empty plans spreadsheet template with validations',
  },
  {
    path: '/api/excel/templates/activities',
    summary: 'Export empty activities spreadsheet template with validations',
  },
  {
    path: '/api/excel/templates/contracts',
    summary: 'Export empty contracts spreadsheet template with validations',
  },
  {
    path: '/api/excel/templates/suppliers',
    summary: 'Export empty suppliers spreadsheet template with validations',
  },
];

for (const t of templates) {
  registry.registerPath({
    method: 'get',
    path: t.path,
    summary: t.summary,
    tags: ['Excel Templates'],
    security,
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
}

const imports = [
  {
    path: '/api/excel/import/projects',
    summary: 'Import projects spreadsheet and update/insert records',
  },
  {
    path: '/api/excel/import/plans',
    summary: 'Import plans spreadsheet and update/insert records',
  },
  {
    path: '/api/excel/import/activities',
    summary: 'Import activities spreadsheet and update/insert records',
  },
  {
    path: '/api/excel/import/contracts',
    summary: 'Import contracts spreadsheet and update/insert records',
  },
  {
    path: '/api/excel/import/suppliers',
    summary: 'Import suppliers spreadsheet and update/insert records',
  },
];

for (const imp of imports) {
  registry.registerPath({
    method: 'post',
    path: imp.path,
    summary: imp.summary,
    tags: ['Excel Templates'],
    security,
    request: {
      body: {
        content: {
          'multipart/form-data': {
            schema: fileUploadSchema,
          },
        },
      },
    },
    responses: {
      200: { description: 'Success response with import counts' },
      400: { description: 'Import parsing or validation error' },
    },
  });
}
