import { z } from 'zod';
import { LDBasis, InspectionVerdict, DiscrepancyStatus } from '@prisma/client';

/**
 * Zod schemas for execution-stage obligations:
 *   - Delivery Period extensions (DPP&I-35 Ch XIII)
 *   - Liquidated Damages (DPP&I-35 Ch XIII)
 *   - Inspection reports (DPP&I-35 Ch XVI)
 *   - Discrepancies (DPP&I-35 Ch XVI)
 */

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));

// --- Delivery Period Extension ------------------------------------------------

export const extendDPSchema = z.object({
  contractId: z.string().min(1),
  newDP: dateLike,
  reason: z.string().min(10).max(5000),
  grantedOn: dateLike,
  documentKey: z.string().max(500).optional(),
});
export type ExtendDPInput = z.infer<typeof extendDPSchema>;

// --- Liquidated Damages -------------------------------------------------------

export const assessLDSchema = z.object({
  contractId: z.string().min(1),
  assessedOn: dateLike,
  periodFrom: dateLike,
  periodTo: dateLike,
  basis: z.nativeEnum(LDBasis).default(LDBasis.PER_MONTH),
  amount: money,
  currency: z.string().length(3).default('PKR'),
  waivedAmount: money.optional(),
  waivedReason: z.string().max(2000).optional(),
});
export type AssessLDInput = z.infer<typeof assessLDSchema>;

// --- Inspection ---------------------------------------------------------------

export const recordInspectionSchema = z.object({
  contractId: z.string().min(1),
  performedOn: dateLike,
  verdict: z.nativeEnum(InspectionVerdict),
  summary: z.string().min(5).max(5000),
  documentKey: z.string().max(500).optional(),
});
export type RecordInspectionInput = z.infer<typeof recordInspectionSchema>;

// --- Discrepancy --------------------------------------------------------------

export const raiseDiscrepancySchema = z.object({
  inspectionId: z.string().min(1),
  raisedOn: dateLike,
  description: z.string().min(5).max(5000),
  severity: z.enum(['MINOR', 'MAJOR', 'CRITICAL']).default('MAJOR'),
});
export type RaiseDiscrepancyInput = z.infer<typeof raiseDiscrepancySchema>;

export const resolveDiscrepancySchema = z.object({
  resolvedOn: dateLike,
  resolutionNotes: z.string().min(5).max(5000),
  outcome: z.enum([DiscrepancyStatus.RESOLVED, DiscrepancyStatus.WAIVED]).default(DiscrepancyStatus.RESOLVED),
});
export type ResolveDiscrepancyInput = z.infer<typeof resolveDiscrepancySchema>;
