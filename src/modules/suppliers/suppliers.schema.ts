import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  tinNumber: z.string().min(5, 'Valid TIN number is required'),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
});

export const getSuppliersQuerySchema = z.object({
  search: z.string().optional(),
  'filter[status]': z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 10)),
});

export type CreateSupplierDto = z.infer<typeof createSupplierSchema>;
export type GetSuppliersQueryDto = z.infer<typeof getSuppliersQuerySchema>;