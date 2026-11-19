import { z } from 'zod';

// Decision Approval — Communication Section lock (v4.4.1 §4.42, manual pp.253–256; Q6).

export const UNAPPROVE_REMARKS_MESSAGE = 'Remarks are required to Un-Approve';

/** APPROVE = lock from further edits; UN_APPROVE = release the lock (remarks required). */
export const decisionApprovalSchema = z
  .object({
    action: z.enum(['APPROVE', 'UN_APPROVE']),
    remarks: z
      .string()
      .trim()
      .max(5000)
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .refine((d) => d.action !== 'UN_APPROVE' || (d.remarks?.length ?? 0) >= 5, {
    message: UNAPPROVE_REMARKS_MESSAGE,
    path: ['remarks'],
  });
export type DecisionApprovalInput = z.infer<typeof decisionApprovalSchema>;
