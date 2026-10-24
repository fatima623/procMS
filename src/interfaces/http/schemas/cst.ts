import { z } from 'zod';

export const prepareCSTSchema = z.object({
  itPerformaId: z.string().length(26),
  lines: z.array(z.object({
    commercialOfferId: z.string().length(26),
    rank: z.number().int().min(1).max(1000),
    recommendedForAward: z.boolean(),
    justification: z.string().max(10_000).optional(),
  })).min(1).max(200),
});
export type PrepareCSTInput = z.infer<typeof prepareCSTSchema>;
