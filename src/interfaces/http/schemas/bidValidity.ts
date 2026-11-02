import { z } from 'zod';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

export const setBidValiditySchema = z.object({
  bidValidUntil: dateLike,
});
export type SetBidValidityInput = z.infer<typeof setBidValiditySchema>;
