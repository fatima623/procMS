import { z } from 'zod';

// DGPR(N) Acknowledgement (v4.4.1 §4.28, manual pp.175–180).

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

/** Optional id; an empty string (blank dropdown) counts as "not set". */
const optionalId = z
  .string()
  .trim()
  .max(26)
  .optional()
  .transform((v) => (v ? v : undefined));

export const LINK_REQUIRED_MESSAGE = 'Link the acknowledgement to a PPRA invoice and/or an IT Proforma';

export const createDGPRNAckSchema = z
  .object({
    invoiceId: optionalId,
    itPerformaId: optionalId,
    receivedOn: dateLike,
    referenceNumber: z.string().trim().min(1).max(80),
    remarks: z.string().max(5000).optional(),
  })
  .refine((d) => !!d.invoiceId || !!d.itPerformaId, { message: LINK_REQUIRED_MESSAGE, path: ['invoiceId'] });
export type CreateDGPRNAckInput = z.infer<typeof createDGPRNAckSchema>;
