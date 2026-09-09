import { z } from 'zod';
import { ProjectStatus } from '../../generated/prisma/index.js';

export const createProjectSchema = z.object({
  code: z.string().trim().min(1, 'Code is required').max(50),
  name: z.string().trim().min(1, 'Name is required').max(255),
  fundingSourceId: z.string().trim().min(1, 'Funding source ID is required'),
  sectorId: z.string().trim().min(1, 'Sector ID is required'),
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
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
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
});

export const assignOfficerSchema = z.object({
  officerId: z.string().trim().min(1, 'Officer ID is required'),
});
