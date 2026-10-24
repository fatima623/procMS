import { z } from 'zod';

export const raiseObservationSchema = z.object({
  note: z.string().min(1).max(10_000),
  raisedToUserId: z.string().length(26).optional(),
});
export type RaiseObservationInput = z.infer<typeof raiseObservationSchema>;

export const resolveObservationsSchema = z.object({
  resolution: z.string().min(1).max(10_000),
});
export type ResolveObservationsInput = z.infer<typeof resolveObservationsSchema>;
