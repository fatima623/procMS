import { z } from 'zod';
import { AdvertisementMedium, GuaranteeType, ExecutionContractStatus } from '@prisma/client';

/**
 * Zod request schemas for the execution-half admin endpoints. These are
 * admin-only maintenance forms — they record what already happened offline
 * (an advertisement was published, a contract signed, a guarantee furnished).
 * No workflow state machines are run here; the domain enforces its own
 * invariants where it should (contract is one-per-indent at the DB level).
 */

const dateLike = z.union([
  z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
  z.date(),
]).transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));

export const createAdvertisementSchema = z.object({
  indentId: z.string().min(1),
  medium: z.nativeEnum(AdvertisementMedium).default(AdvertisementMedium.PPRA_WEBSITE),
  publishedOn: dateLike,
  biddingDocsIssuedOn: dateLike.optional(),
  bidSubmissionDeadline: dateLike.optional(),
});
export type CreateAdvertisementInput = z.infer<typeof createAdvertisementSchema>;

export const createContractSchema = z.object({
  indentId: z.string().min(1),
  purchaseRequisitionId: z.string().min(1).optional(),
  firmId: z.string().min(1),
  contractNumber: z.string().min(1).max(60),
  value: money,
  currency: z.string().length(3).default('PKR'),
  awardedOn: dateLike.optional(),
  signedOn: dateLike.optional(),
  status: z.nativeEnum(ExecutionContractStatus).default(ExecutionContractStatus.SIGNED),
  takingOverCertifiedOn: dateLike.optional(),
  closedOn: dateLike.optional(),
});
export type CreateContractInput = z.infer<typeof createContractSchema>;

export const createGuaranteeSchema = z.object({
  contractId: z.string().min(1),
  type: z.nativeEnum(GuaranteeType),
  amount: money,
  currency: z.string().length(3).default('PKR'),
  furnishedOn: dateLike.optional(),
  expiresOn: dateLike.optional(),
});
export type CreateGuaranteeInput = z.infer<typeof createGuaranteeSchema>;

export const createInvoiceSchema = z.object({
  contractId: z.string().min(1),
  invoiceNumber: z.string().min(1).max(60),
  receivedOn: dateLike,
  amount: money,
  currency: z.string().length(3).default('PKR'),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const createPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  paidOn: dateLike,
  amount: money,
  currency: z.string().length(3).default('PKR'),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const createLCSchema = z.object({
  contractId: z.string().min(1),
  lcNumber: z.string().min(1).max(60),
  openedOn: dateLike.optional(),
});
export type CreateLCInput = z.infer<typeof createLCSchema>;

export const createLCAmendmentSchema = z.object({
  letterOfCreditId: z.string().min(1),
  requestedOn: dateLike,
  finalizedOn: dateLike.optional(),
});
export type CreateLCAmendmentInput = z.infer<typeof createLCAmendmentSchema>;
