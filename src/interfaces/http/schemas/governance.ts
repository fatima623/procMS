import { z } from 'zod';
import { CommitteeKind, ContractAmendmentScope } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number()]).transform((v) => String(v));

// --- Committees (PPRA Rule 48 GRC + TEC / FEC / INSPECTION) ------------------

export const createCommitteeSchema = z.object({
  kind: z.nativeEnum(CommitteeKind),
  name: z.string().min(3).max(200),
  termStart: dateLike,
  termEnd: dateLike.optional(),
  notes: z.string().max(5000).optional(),
  members: z
    .array(z.object({
      userId: z.string().min(1),
      memberRole: z.string().min(1).max(80),
      joinedOn: dateLike,
    }))
    .min(1)
    .max(21),
});
export type CreateCommitteeInput = z.infer<typeof createCommitteeSchema>;

export const addCommitteeMemberSchema = z.object({
  userId: z.string().min(1),
  memberRole: z.string().min(1).max(80),
  joinedOn: dateLike,
});
export type AddCommitteeMemberInput = z.infer<typeof addCommitteeMemberSchema>;

export const removeCommitteeMemberSchema = z.object({
  leftOn: dateLike,
});
export type RemoveCommitteeMemberInput = z.infer<typeof removeCommitteeMemberSchema>;

// --- Contract Amendments (DPP&I-35 Ch XXI) -----------------------------------

export const proposeContractAmendmentSchema = z.object({
  contractId: z.string().min(1),
  scope: z.nativeEnum(ContractAmendmentScope),
  summary: z.string().min(10).max(5000),
  deltaValue: money.optional(),
  deltaCurrency: z.string().length(3).optional(),
  requestedOn: dateLike,
  documentKey: z.string().max(500).optional(),
});
export type ProposeContractAmendmentInput = z.infer<typeof proposeContractAmendmentSchema>;

export const approveContractAmendmentSchema = z.object({
  approvedOn: dateLike,
});
export type ApproveContractAmendmentInput = z.infer<typeof approveContractAmendmentSchema>;

export const rejectContractAmendmentSchema = z.object({
  rejectionReason: z.string().min(5).max(2000),
});
export type RejectContractAmendmentInput = z.infer<typeof rejectContractAmendmentSchema>;
