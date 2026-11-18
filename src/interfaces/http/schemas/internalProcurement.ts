import { z } from 'zod';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const bigintLike = z
  .union([z.string().min(1), z.number(), z.bigint()])
  .transform((v) => BigInt(v));

const quantity = z
  .union([z.string().min(1), z.number().positive()])
  .transform((v) => String(v));

export const procurementItemInputSchema = z.object({
  itemName: z.string().min(2).max(255),
  quantity,
  uom: z.string().min(1).max(20),
});
export type ProcurementItemInput = z.infer<typeof procurementItemInputSchema>;

export const createInternalProcurementSchema = z.object({
  notes: z.string().max(5000).optional(),
  items: z.array(procurementItemInputSchema).min(1, 'At least one item is required'),
});
export type CreateInternalProcurementInput = z.infer<typeof createInternalProcurementSchema>;

export const inviteFirmSchema = z.object({
  firmId: z.string().min(1),
});
export type InviteFirmInput = z.infer<typeof inviteFirmSchema>;

export const enterQuotationSchema = z.object({
  firmId: z.string().min(1),
  itemId: z.string().min(1),
  quotedPriceMinor: bigintLike,
  currency: z.string().min(1).max(3).default('PKR'),
});
export type EnterQuotationInput = z.infer<typeof enterQuotationSchema>;

export const createSupplyOrderSchema = z.object({
  firmId: z.string().min(1),
  orderedOn: dateLike.optional(),
  totalValueMinor: bigintLike,
  currency: z.string().min(1).max(3).default('PKR'),
  documentKey: z.string().max(500).optional(),
});
export type CreateSupplyOrderInput = z.infer<typeof createSupplyOrderSchema>;

export const createSanctionCertSchema = z.object({
  certificateNumber: z.string().min(1).max(50),
  issuedOn: dateLike.optional(),
  authority: z.string().min(1).max(100),
  documentKey: z.string().max(500).optional(),
});
export type CreateSanctionCertInput = z.infer<typeof createSanctionCertSchema>;

export const createDebitableVoucherSchema = z.object({
  voucherNumber: z.string().min(1).max(50),
  amountMinor: bigintLike,
  currency: z.string().min(1).max(3).default('PKR'),
  issuedOn: dateLike.optional(),
});
export type CreateDebitableVoucherInput = z.infer<typeof createDebitableVoucherSchema>;

export const createContingentBillSchema = z.object({
  firmId: z.string().min(1),
  billNumber: z.string().min(1).max(50),
  amountMinor: bigintLike,
  currency: z.string().min(1).max(3).default('PKR'),
  submittedOn: dateLike.optional(),
  paidOn: dateLike.optional(),
});
export type CreateContingentBillInput = z.infer<typeof createContingentBillSchema>;
