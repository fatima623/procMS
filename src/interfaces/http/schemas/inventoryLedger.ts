import { z } from 'zod';
import { InventoryLedgerKind } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const quantity = z
  .union([z.string().min(1), z.number().positive()])
  .transform((v) => String(v));

export const createInventoryLedgerEntrySchema = z.object({
  kind: z.nativeEnum(InventoryLedgerKind),
  happenedOn: dateLike.optional(),
  sourceDemandId: z.string().optional(),
  sourceITPerformaId: z.string().optional(),
  itemName: z.string().min(2).max(255),
  quantity,
  uom: z.string().min(1).max(20),
  remarks: z.string().max(2000).optional(),
});
export type CreateInventoryLedgerEntryInput = z.infer<typeof createInventoryLedgerEntrySchema>;
