import { z } from 'zod';

export const issuePRSchema = z.object({
  cstId: z.string().length(26),
  prNumber: z.string().min(5).max(60),
});
export type IssuePRInput = z.infer<typeof issuePRSchema>;
