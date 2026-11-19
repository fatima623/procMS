import { z } from 'zod';
import { CorrespondenceDirection, MinuteKind } from '@prisma/client';

// Central Registry — Mail Inward/Outward, Minutes, Postal Stamp (v4.4.1 §4.5–§4.7).

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

/** Upper-case letters, digits, "/" and "-". e.g. CR/IN/2026/00001 */
export const CONTROL_NUMBER_PATTERN = /^[A-Z0-9][A-Z0-9/-]{2,39}$/;

export const createCorrespondenceSchema = z.object({
  direction: z.nativeEnum(CorrespondenceDirection),
  /** Optional — auto-generated as CR/IN|OUT/<year>/<seq> when blank. */
  controlNumber: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CONTROL_NUMBER_PATTERN, 'Use 3–40 characters: capital letters, digits, "/" or "-"')
    .optional(),
  subject: z.string().trim().min(3).max(500),
  fromParty: z.string().trim().min(2).max(200),
  toParty: z.string().trim().min(2).max(200),
  receivedOrSentOn: dateLike,
  assignedToUserId: z.string().min(1).max(26).optional(),
  remarks: z.string().max(5000).optional(),
  documentKey: z.string().max(500).optional(),
});
export type CreateCorrespondenceInput = z.infer<typeof createCorrespondenceSchema>;

export const assignCorrespondenceSchema = z.object({
  /** null clears the assignment. */
  assignedToUserId: z.string().min(1).max(26).nullable(),
});
export type AssignCorrespondenceInput = z.infer<typeof assignCorrespondenceSchema>;

export const addMinuteSchema = z.object({
  kind: z.nativeEnum(MinuteKind),
  text: z.string().trim().min(2).max(5000),
});
export type AddMinuteInput = z.infer<typeof addMinuteSchema>;

export const createPostalStampSchema = z.object({
  correspondenceId: z.string().min(1).max(26).optional(),
  /** Face value of ONE stamp in PKR, up to 2 decimals. */
  denomination: z.coerce
    .number()
    .positive()
    .max(100_000)
    .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, 'At most 2 decimal places'),
  quantity: z.coerce.number().int().positive().max(10_000),
  usedOn: dateLike,
});
export type CreatePostalStampInput = z.infer<typeof createPostalStampSchema>;
