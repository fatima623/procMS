import { z } from 'zod';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const quantity = z
  .union([z.string().min(1), z.number().positive()])
  .transform((v) => String(v));

export const demandItemSchema = z.object({
  itemName: z.string().min(2).max(255),
  quantity,
  uom: z.string().min(1).max(20),
  remarks: z.string().max(500).optional(),
});
export type DemandItemInput = z.infer<typeof demandItemSchema>;

export const createDemandSchema = z.object({
  raisedForSectionId: z.string().min(1),
  raisedOn: dateLike.optional(),
  notes: z.string().max(5000).optional(),
  items: z.array(demandItemSchema).min(1, 'At least one item is required'),
});
export type CreateDemandInput = z.infer<typeof createDemandSchema>;

export const updateDemandSchema = z.object({
  notes: z.string().max(5000).optional(),
});
export type UpdateDemandInput = z.infer<typeof updateDemandSchema>;