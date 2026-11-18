import { z } from 'zod';

export const createTelephoneBillSchema = z.object({
  phoneNumber: z.string().min(1).max(50),
  billMonth:   z.string().regex(/^\d{4}-\d{2}$/, 'Must be YYYY-MM format'),
  billAmountMinor: z
    .union([z.string().min(1), z.number(), z.bigint()])
    .transform((v) => BigInt(v)),
  currency: z.string().max(3).default('PKR'),
  dueDate:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v)),
});
export type CreateTelephoneBillInput = z.infer<typeof createTelephoneBillSchema>;

export const markPaidSchema = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform((v) => new Date(v)),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
