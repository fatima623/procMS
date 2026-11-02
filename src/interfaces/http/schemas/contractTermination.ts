import { z } from 'zod';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

export const terminateContractSchema = z.object({
  terminationReason: z.string().min(10).max(5000),
  openRiskPurchaseCase: z.boolean().default(true),
  initiatedOn: dateLike,
});
export type TerminateContractInput = z.infer<typeof terminateContractSchema>;
