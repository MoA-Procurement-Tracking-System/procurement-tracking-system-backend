import { z } from 'zod';
import { ProjectStatus } from '../../generated/prisma/index.js';
import { registry } from '../../config/openapi.js';

export const createProjectSchema = registry.register(
  'CreateProject',
  z
    .object({
      code: z
        .string()
        .trim()
        .min(1, 'Code is required')
        .max(50)
        .openapi({ example: 'BREFONS' }),
      pNumber: z.string().trim().optional().openapi({ example: 'P176524' }),
      name: z
        .string()
        .trim()
        .min(1, 'Name is required')
        .max(255)
        .openapi({ example: 'National Agriculture Irrigation Program' }),
      description: z.string().trim().optional(),
      totalBudget: z.number().positive().optional(),
      fundingSourceId: z
        .string()
        .trim()
        .min(1, 'Funding source ID is required')
        .openapi({ example: 'fs-uuid-1' }),
      sectorId: z
        .string()
        .trim()
        .min(1, 'Sector ID is required')
        .openapi({ example: 'sec-uuid-1' }),
      sapIdentificationNo: z
        .string()
        .trim()
        .optional()
        .openapi({ example: 'SAP-998877' }),
      country: z.string().trim().optional().openapi({ example: 'Ethiopia' }),
      executingAgency: z
        .string()
        .trim()
        .optional()
        .openapi({ example: 'Ministry of Agriculture' }),
      organization: z.string().trim().optional(),
      fundingType: z.string().trim().optional(),
      loanGrantNumbers: z.array(z.string()).optional(),
      components: z.array(z.string()).optional(),
      subcomponents: z.array(z.string()).optional(),
      baseCurrency: z.string().trim().optional().openapi({ example: 'USD' }),
      projectStartDate: z.coerce.date().optional(),
      projectEndDate: z.coerce.date().optional(),
      effectivenessDate: z.coerce.date().optional(),
      closingDate: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.projectStartDate && data.projectEndDate) {
          return (
            new Date(data.projectEndDate) > new Date(data.projectStartDate)
          );
        }
        return true;
      },
      {
        message: 'Project End Date must be after the Project Start Date.',
        path: ['projectEndDate'],
      },
    ),
);

export const updateProjectSchema = registry.register(
  'UpdateProject',
  z
    .object({
      code: z.string().trim().min(1).max(50).optional(),
      pNumber: z.string().trim().optional(),
      name: z.string().trim().min(1).max(255).optional(),
      description: z.string().trim().optional(),
      totalBudget: z.number().positive().optional(),
      status: z.nativeEnum(ProjectStatus).optional(),
      sapIdentificationNo: z.string().trim().optional(),
      country: z.string().trim().optional(),
      executingAgency: z.string().trim().optional(),
      organization: z.string().trim().optional(),
      fundingType: z.string().trim().optional(),
      loanGrantNumbers: z.array(z.string()).optional(),
      components: z.array(z.string()).optional(),
      subcomponents: z.array(z.string()).optional(),
      baseCurrency: z.string().trim().optional(),
      projectStartDate: z.coerce.date().optional(),
      projectEndDate: z.coerce.date().optional(),
      effectivenessDate: z.coerce.date().optional(),
      closingDate: z.coerce.date().optional(),
    })
    .refine(
      (data) => {
        if (data.projectStartDate && data.projectEndDate) {
          return (
            new Date(data.projectEndDate) > new Date(data.projectStartDate)
          );
        }
        return true;
      },
      {
        message: 'Project End Date must be after the Project Start Date.',
        path: ['projectEndDate'],
      },
    ),
);

export const assignOfficerSchema = registry.register(
  'AssignOfficer',
  z.object({
    officerId: z
      .string()
      .trim()
      .min(1, 'Officer ID is required')
      .openapi({ example: 'officer-uuid-123' }),
  }),
);

// Register OpenAPI Paths for Projects
registry.registerPath({
  method: 'get',
  path: '/api/projects',
  summary: 'List active projects',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  responses: {
    200: { description: 'List of projects' },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/projects/{id}',
  summary: 'Get a project by ID',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Project UUID' }),
    }),
  },
  responses: {
    200: { description: 'Project found' },
    404: { description: 'Project not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/projects',
  summary: 'Create a new project',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createProjectSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Project created' },
    400: { description: 'Validation error' },
  },
});

registry.registerPath({
  method: 'patch',
  path: '/api/projects/{id}',
  summary: 'Update an existing project',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Project UUID' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: updateProjectSchema,
        },
      },
    },
  },
  responses: {
    200: { description: 'Project updated' },
    404: { description: 'Project not found' },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/projects/{id}/officers',
  summary: 'Assign a procurement officer to a project',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Project UUID' }),
    }),
    body: {
      content: {
        'application/json': {
          schema: assignOfficerSchema,
        },
      },
    },
  },
  responses: {
    201: { description: 'Officer assigned' },
    409: { description: 'Officer already assigned' },
  },
});

registry.registerPath({
  method: 'delete',
  path: '/api/projects/{id}/officers/{officerId}',
  summary: 'Remove a procurement officer from a project',
  tags: ['Projects'],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({ description: 'Project UUID' }),
      officerId: z.string().openapi({ description: 'Officer UUID' }),
    }),
  },
  responses: {
    204: { description: 'Officer removed' },
    404: { description: 'Assignment not found' },
  },
});
