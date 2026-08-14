import { z } from 'zod';
export const createContractSchema = z.object({
  contractNumber: z.string().min(1, 'Contract number is required'),
  activityId: z.string().uuid(),
  supplierId: z.string().uuid(),
  originalAmount: z.number().positive('Original amount must be greater than 0'),
  currentAmount: z.number().positive('Current amount must be greater than 0'),
  currencyId: z.string().uuid(),
  regionId: z.string().uuid().nullable().optional(),
  statusId: z.string().uuid(),
  isDeleted: z.boolean().optional(),
});
export const updateContractSchema = createContractSchema.partial();
export const getContractPaymentsQuerySchema = z.object({
  'filter[status]': z.enum(['PAID', 'PENDING', 'FAILED']).optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  typeId: z.string().uuid(),
  statusId: z.string().uuid(),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  requestDate: z.coerce.date().optional(),
  paymentDate: z.coerce.date().optional(),
});

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdateContractDto = z.infer<typeof updateContractSchema>;
export type GetContractPaymentsQueryDto = z.infer<
  typeof getContractPaymentsQuerySchema
>;
