import { z } from 'zod';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

export const createVehicleRequisitionSchema = z.object({
  purpose: z.string().min(3).max(1000),
  fromLocation: z.string().min(2).max(255),
  toLocation: z.string().min(2).max(255),
  requiredFrom: dateLike,
  requiredTo: dateLike,
  passengerCount: z.coerce.number().int().min(1).max(100),
  remarks: z.string().max(1000).optional(),
});
export type CreateVehicleRequisitionInput = z.infer<typeof createVehicleRequisitionSchema>;

export const decideVehicleRequisitionSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  assignedVehicleRef: z.string().max(100).optional(),
  remarks: z.string().max(1000).optional(),
});
export type DecideVehicleRequisitionInput = z.infer<typeof decideVehicleRequisitionSchema>;
