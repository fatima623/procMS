import { z } from 'zod';
import { FirmRegistrationCategory } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

export const submitFirmRegistrationSchema = z.object({
  firmId: z.string().min(1),
  category: z.nativeEnum(FirmRegistrationCategory),
  submittedOn: dateLike,
  certificateKey: z.string().max(500).optional(),
});
export type SubmitFirmRegistrationInput = z.infer<typeof submitFirmRegistrationSchema>;

export const approveFirmRegistrationSchema = z.object({
  issuedOn: dateLike,
  validUntil: dateLike,
  reviewNotes: z.string().max(2000).optional(),
  certificateKey: z.string().max(500).optional(),
});
export type ApproveFirmRegistrationInput = z.infer<typeof approveFirmRegistrationSchema>;

export const rejectFirmRegistrationSchema = z.object({
  reviewNotes: z.string().min(5).max(2000),
});
export type RejectFirmRegistrationInput = z.infer<typeof rejectFirmRegistrationSchema>;

export const revokeFirmRegistrationSchema = z.object({
  revokedOn: dateLike,
  revokedReason: z.string().min(5).max(2000),
});
export type RevokeFirmRegistrationInput = z.infer<typeof revokeFirmRegistrationSchema>;
