import { z } from 'zod';

// Legal Section — Court Cases + Proceeding History (v4.4.1 §4.31, manual pp.194–200).

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

/** Optional date; an empty string (blank date input) counts as "not set". */
const optionalDate = z.preprocess((v) => (v === '' || v === null ? undefined : v), dateLike.optional());

/** Optional id; an empty string (blank dropdown) counts as "not set". */
const optionalId = z
  .string()
  .trim()
  .max(26)
  .optional()
  .transform((v) => (v ? v : undefined));

export const createCourtCaseSchema = z.object({
  caseNumber: z.string().trim().min(1).max(80),
  court: z.string().trim().min(2).max(200),
  party: z.string().trim().min(2).max(200),
  counterParty: z.string().trim().min(2).max(200),
  filedOn: dateLike,
  relatedIndentId: optionalId,
  relatedContractId: optionalId,
  documentKey: z.string().max(500).optional(),
});
export type CreateCourtCaseInput = z.infer<typeof createCourtCaseSchema>;

export const NEXT_HEARING_MESSAGE = 'Next hearing date must be after the hearing date';

export const addProceedingSchema = z
  .object({
    hearingDate: dateLike,
    outcome: z.string().trim().min(2).max(500),
    nextHearingDate: optionalDate,
    notes: z.string().max(10_000).optional(),
    documentKey: z.string().max(500).optional(),
  })
  .refine((d) => !d.nextHearingDate || d.nextHearingDate.getTime() > d.hearingDate.getTime(), {
    message: NEXT_HEARING_MESSAGE,
    path: ['nextHearingDate'],
  });
export type AddProceedingInput = z.infer<typeof addProceedingSchema>;

/** Final statuses a PENDING case can move to. */
export const changeCourtCaseStatusSchema = z.object({
  status: z.enum(['CLOSED', 'DISPOSED_OFF']),
});
export type ChangeCourtCaseStatusInput = z.infer<typeof changeCourtCaseStatusSchema>;
