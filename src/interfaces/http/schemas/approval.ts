import { z } from 'zod';

export const decideApprovalSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'RETURNED']),
  comments: z.string().max(10_000).optional(),
});

export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;
