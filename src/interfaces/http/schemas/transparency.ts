import { z } from 'zod';
import { MisprocurementSeverity, RetentionHoldReason } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

// --- Mis-procurement incidents (PPRA Rule 50) --------------------------------

export const createIncidentSchema = z.object({
  indentId: z.string().min(1).optional(),
  ruleReference: z.string().min(3).max(80),
  summary: z.string().min(5).max(500),
  details: z.string().min(10).max(5000),
  severity: z.nativeEnum(MisprocurementSeverity).default(MisprocurementSeverity.MEDIUM),
  detectedOn: dateLike,
  documentKey: z.string().max(500).optional(),
});
export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const remediateIncidentSchema = z.object({
  remediatedOn: dateLike,
  notes: z.string().max(2000).optional(),
});
export type RemediateIncidentInput = z.infer<typeof remediateIncidentSchema>;

export const reportIncidentToPPRASchema = z.object({
  reportedToPPRAOn: dateLike,
});
export type ReportIncidentToPPRAInput = z.infer<typeof reportIncidentToPPRASchema>;

// --- Retention holds (PPRA Rule 46) ------------------------------------------

export const placeRetentionHoldSchema = z.object({
  subjectType: z.string().min(3).max(40),
  subjectId: z.string().min(1).max(26),
  reason: z.nativeEnum(RetentionHoldReason),
  placedOn: dateLike,
  notes: z.string().max(5000).optional(),
});
export type PlaceRetentionHoldInput = z.infer<typeof placeRetentionHoldSchema>;

export const releaseRetentionHoldSchema = z.object({
  releasedOn: dateLike,
  notes: z.string().max(5000).optional(),
});
export type ReleaseRetentionHoldInput = z.infer<typeof releaseRetentionHoldSchema>;
