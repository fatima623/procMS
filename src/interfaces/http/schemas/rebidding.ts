import { z } from 'zod';

export const rejectAllOffersSchema = z.object({
  reason: z.string().min(10).max(5000),
});
export type RejectAllOffersInput = z.infer<typeof rejectAllOffersSchema>;
