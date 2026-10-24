import { z } from 'zod';

export const openCommercialOfferSchema = z.object({
  itPerformaId: z.string().length(26),
  firmId: z.string().length(26),
  totalPriceMinor: z.string().regex(/^\d+$/),
  currency: z.string().length(3).regex(/^[A-Z]{3}$/),
  deliveryWeeks: z.number().int().min(0).max(520).optional(),
  documentKey: z.string().max(500).optional(),
});
export type OpenCommercialOfferInput = z.infer<typeof openCommercialOfferSchema>;
