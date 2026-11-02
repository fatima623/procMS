import { z } from 'zod';
import { BlacklistGround, GrievanceStage, GrievanceStatus } from '@prisma/client';

/**
 * Zod request schemas for the compliance-control endpoints (Blacklist,
 * IntegrityPact, Grievance). These enforce input shape at the HTTP edge
 * before the use-case runs its business invariants.
 */

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

// --- Blacklist (PPRA Rule 19) -------------------------------------------------

export const declareBlacklistSchema = z.object({
  firmId: z.string().min(1),
  ground: z.nativeEnum(BlacklistGround),
  reason: z.string().min(10).max(5000),
  declaredOn: dateLike,
  effectiveFrom: dateLike,
  effectiveUntil: dateLike.optional(),
  documentKey: z.string().max(500).optional(),
});
export type DeclareBlacklistInput = z.infer<typeof declareBlacklistSchema>;

export const revokeBlacklistSchema = z.object({
  revokedOn: dateLike,
  revokedReason: z.string().min(5).max(2000),
});
export type RevokeBlacklistInput = z.infer<typeof revokeBlacklistSchema>;

// --- Integrity Pact (PPRA Rule 7) --------------------------------------------

export const createIntegrityPactSchema = z.object({
  indentId: z.string().min(1),
  firmId: z.string().min(1),
  signedByBuyerOn: dateLike,
  signedBySupplierOn: dateLike.optional(),
  documentKey: z.string().max(500).optional(),
});
export type CreateIntegrityPactInput = z.infer<typeof createIntegrityPactSchema>;

export const counterSignIntegrityPactSchema = z.object({
  signedBySupplierOn: dateLike,
});
export type CounterSignIntegrityPactInput = z.infer<typeof counterSignIntegrityPactSchema>;

// --- Grievance (PPRA Rules 48, 50) --------------------------------------------

export const fileGrievanceSchema = z.object({
  indentId: z.string().min(1),
  firmId: z.string().min(1).optional(),  // anonymous allowed
  filedOn: dateLike,
  basis: z.string().min(10).max(5000),
  stage: z.nativeEnum(GrievanceStage).default(GrievanceStage.PRE_AWARD),
  documentKey: z.string().max(500).optional(),
});
export type FileGrievanceInput = z.infer<typeof fileGrievanceSchema>;

export const decideGrievanceSchema = z.object({
  decision: z.enum([GrievanceStatus.UPHELD, GrievanceStatus.REJECTED]),
  grcDecisionOn: dateLike,
  grcDecisionText: z.string().min(10).max(5000),
});
export type DecideGrievanceInput = z.infer<typeof decideGrievanceSchema>;

export const appealGrievanceSchema = z.object({
  appealedToPPRAOn: dateLike,
});
export type AppealGrievanceInput = z.infer<typeof appealGrievanceSchema>;

export const withdrawGrievanceSchema = z.object({
  reason: z.string().min(5).max(2000).optional(),
});
export type WithdrawGrievanceInput = z.infer<typeof withdrawGrievanceSchema>;
