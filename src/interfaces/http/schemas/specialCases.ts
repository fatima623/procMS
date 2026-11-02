import { z } from 'zod';
import { DisposalKind, FMSStatus } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));

// --- FMS (DPP&I-35 Ch XXIV) --------------------------------------------------

export const openFMSSchema = z.object({
  indentId: z.string().min(1),
  caseNumber: z.string().min(3).max(60),
  foreignAuthority: z.string().min(3).max(255),
  lorSubmittedOn: dateLike,
  currency: z.string().length(3).default('USD'),
  notes: z.string().max(5000).optional(),
  documentKey: z.string().max(500).optional(),
});
export type OpenFMSInput = z.infer<typeof openFMSSchema>;

export const recordLOASchema = z.object({
  loaReceivedOn: dateLike,
  loaValue: money,
  currency: z.string().length(3),
  deliveryExpectedBy: dateLike.optional(),
});
export type RecordLOAInput = z.infer<typeof recordLOASchema>;

export const acceptLOASchema = z.object({
  loaAcceptedOn: dateLike,
});
export type AcceptLOAInput = z.infer<typeof acceptLOASchema>;

export const completeFMSDeliverySchema = z.object({
  deliveryCompletedOn: dateLike,
});
export type CompleteFMSDeliveryInput = z.infer<typeof completeFMSDeliverySchema>;

export const closeFMSSchema = z.object({
  closedOn: dateLike,
});
export type CloseFMSInput = z.infer<typeof closeFMSSchema>;

export const cancelFMSSchema = z.object({
  cancelledOn: dateLike,
  cancelledReason: z.string().min(5).max(2000),
});
export type CancelFMSInput = z.infer<typeof cancelFMSSchema>;

// --- Disposal (DPP&I-35 Ch XXV) ----------------------------------------------

export const createDisposalSchema = z.object({
  reference: z.string().min(3).max(60),
  kind: z.nativeEnum(DisposalKind),
  description: z.string().min(5).max(500),
  initiatedOn: dateLike,
  currency: z.string().length(3).default('PKR'),
  bidOpensOn: dateLike.optional(),
  bidClosesOn: dateLike.optional(),
  lots: z
    .array(z.object({
      lotNumber: z.number().int().min(1),
      description: z.string().min(3).max(500),
      reservePrice: money.optional(),
      currency: z.string().length(3).default('PKR'),
    }))
    .min(1)
    .max(100),
});
export type CreateDisposalInput = z.infer<typeof createDisposalSchema>;

export const openDisposalForBidsSchema = z.object({
  bidOpensOn: dateLike,
  bidClosesOn: dateLike,
});
export type OpenDisposalForBidsInput = z.infer<typeof openDisposalForBidsSchema>;

export const awardLotSchema = z.object({
  winningBid: money,
  currency: z.string().length(3).default('PKR'),
  winningBidderName: z.string().min(1).max(255),
  winningBidderFirmId: z.string().min(1).optional(),
  awardedOn: dateLike,
});
export type AwardLotInput = z.infer<typeof awardLotSchema>;

export const completeDisposalSchema = z.object({
  completedOn: dateLike,
});
export type CompleteDisposalInput = z.infer<typeof completeDisposalSchema>;

export const cancelDisposalSchema = z.object({
  cancelledReason: z.string().min(5).max(2000),
});
export type CancelDisposalInput = z.infer<typeof cancelDisposalSchema>;

// --- Appeals (PPRA Rule 50; DPP&I-35 Ch XXVIII) ------------------------------

export const fileAppealSchema = z.object({
  grievanceId: z.string().min(1),
  filedOn: dateLike,
  basis: z.string().min(10).max(5000),
  documentKey: z.string().max(500).optional(),
});
export type FileAppealInput = z.infer<typeof fileAppealSchema>;

export const decideAppealSchema = z.object({
  decision: z.enum(['UPHELD', 'REJECTED']),
  decidedOn: dateLike,
  decisionText: z.string().min(10).max(5000),
});
export type DecideAppealInput = z.infer<typeof decideAppealSchema>;

export const withdrawAppealSchema = z.object({
  reason: z.string().max(2000).optional(),
});
export type WithdrawAppealInput = z.infer<typeof withdrawAppealSchema>;

// Re-export enum values for client-side forms
export const FMS_STATUS_LIST = Object.values(FMSStatus);
