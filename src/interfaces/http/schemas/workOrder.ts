import { z } from 'zod';
import { WorkOrderKind, WorkOrderStatus } from '@prisma/client';

const bigintLike = z
  .union([z.string().min(1), z.number(), z.bigint()])
  .transform((v) => BigInt(v));

export const createWorkOrderSchema = z.object({
  kind: z.nativeEnum(WorkOrderKind),
  subject: z.string().min(3).max(255),
  assignedTo: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
});
export type CreateWorkOrderInput = z.infer<typeof createWorkOrderSchema>;

export const updateWorkOrderStatusSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus),
  assignedTo: z.string().max(100).optional(),
  costMinor: bigintLike.optional(),
  currency: z.string().max(3).default('PKR'),
  notes: z.string().max(2000).optional(),
});
export type UpdateWorkOrderStatusInput = z.infer<typeof updateWorkOrderStatusSchema>;
