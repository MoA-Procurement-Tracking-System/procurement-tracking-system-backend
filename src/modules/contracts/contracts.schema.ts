import { z } from 'zod';;
export const createContractSchema = z.object({
  contractNo: z.string().min(1, 'Contract number is required'),
  supplierId: z.string().optional(),
  totalValue: z.number().positive('Total value must be greater than 0'),
  currency: z.string().optional().default('USD'),
  region: z.string().optional(),
  sector: z.string().optional(),
  isDeleted: z.boolean().optional(),
});
export const updateContractSchema = createContractSchema.partial()
export const getContractPaymentsQuerySchema = z.object({
  'filter[status]': z.enum(['PAID', 'PENDING', 'FAILED']).optional(),
});

export const createPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  referenceNo: z.string().min(1, 'Reference number is required'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  paymentDate: z.coerce.date().optional(),
});

export type CreateContractDto = z.infer<typeof createContractSchema>;
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;
export type UpdateContractDto = z.infer<typeof updateContractSchema>;
export type GetContractPaymentsQueryDto = z.infer<typeof getContractPaymentsQuerySchema>;