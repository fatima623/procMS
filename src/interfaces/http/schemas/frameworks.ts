import { z } from 'zod';
import { FrameworkAgreementKind, ProcurementCategory, CallOffStatus } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));

// --- Risk purchase (DPP&I-35 Ch XXII) ---------------------------------------

export const openRiskPurchaseSchema = z.object({
  originalContractId: z.string().min(1),
  triggerReason: z.string().min(10).max(5000),
  initiatedOn: dateLike,
  notes: z.string().max(5000).optional(),
});
export type OpenRiskPurchaseInput = z.infer<typeof openRiskPurchaseSchema>;

export const linkReplacementSchema = z.object({
  replacementIndentId: z.string().min(1).optional(),
  replacementContractId: z.string().min(1).optional(),
}).refine((v) => v.replacementIndentId || v.replacementContractId, {
  message: 'Provide at least one of replacementIndentId / replacementContractId',
});
export type LinkReplacementInput = z.infer<typeof linkReplacementSchema>;

export const settleRiskPurchaseSchema = z.object({
  riskSettled: money,
  currency: z.string().length(3).default('PKR'),
  settledOn: dateLike,
});
export type SettleRiskPurchaseInput = z.infer<typeof settleRiskPurchaseSchema>;

export const closeRiskPurchaseSchema = z.object({
  closedOn: dateLike,
});
export type CloseRiskPurchaseInput = z.infer<typeof closeRiskPurchaseSchema>;

// --- Framework agreements + call-offs ---------------------------------------

export const createFrameworkSchema = z.object({
  reference: z.string().min(3).max(60),
  kind: z.nativeEnum(FrameworkAgreementKind),
  name: z.string().min(3).max(255),
  category: z.nativeEnum(ProcurementCategory).default(ProcurementCategory.GOODS),
  validFrom: dateLike,
  validTo: dateLike,
  maxValue: money.optional(),
  currency: z.string().length(3).default('PKR'),
  firmIds: z.array(z.string().min(1)).min(1).max(20),
  documentKey: z.string().max(500).optional(),
});
export type CreateFrameworkInput = z.infer<typeof createFrameworkSchema>;

export const activateFrameworkSchema = z.object({
  signedOn: dateLike,
});
export type ActivateFrameworkInput = z.infer<typeof activateFrameworkSchema>;

export const terminateFrameworkSchema = z.object({
  terminatedOn: dateLike,
  terminatedReason: z.string().min(5).max(2000),
});
export type TerminateFrameworkInput = z.infer<typeof terminateFrameworkSchema>;

export const createCallOffSchema = z.object({
  frameworkAgreementId: z.string().min(1),
  firmId: z.string().min(1),
  callOffNumber: z.string().min(3).max(60),
  description: z.string().min(3).max(500),
  amount: money,
  currency: z.string().length(3).default('PKR'),
  placedOn: dateLike,
  documentKey: z.string().max(500).optional(),
});
export type CreateCallOffInput = z.infer<typeof createCallOffSchema>;

export const fulfillCallOffSchema = z.object({
  fulfilledOn: dateLike,
});
export type FulfillCallOffInput = z.infer<typeof fulfillCallOffSchema>;

export const cancelCallOffSchema = z.object({
  cancelledOn: dateLike,
  cancelledReason: z.string().min(5).max(2000),
});
export type CancelCallOffInput = z.infer<typeof cancelCallOffSchema>;

// Export the CallOffStatus for other modules to re-type on
export type CallOffStatusValue = (typeof CallOffStatus)[keyof typeof CallOffStatus];
