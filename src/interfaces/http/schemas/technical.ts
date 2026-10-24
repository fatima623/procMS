import { z } from 'zod';

export const submitTechnicalOfferSchema = z.object({
  itPerformaId: z.string().length(26),
  documentKey: z.string().max(500).optional(),
  remarks: z.string().max(10_000).optional(),
});

export type SubmitTechnicalOfferInput = z.infer<typeof submitTechnicalOfferSchema>;
