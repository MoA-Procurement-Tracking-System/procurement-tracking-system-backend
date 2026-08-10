import { z } from 'zod';

export const createLookupSchema = z.object({
  type: z.string().trim().min(1),
  code: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

export const updateLookupSchema = z
  .object({
    label: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field required',
  });

export const lookupIdParamSchema = z.object({
  id: z.uuid('Invalid lookup id'),
});
export const lookupTypeQuerySchema = z.object({
  type: z.string().trim().optional(),
});
