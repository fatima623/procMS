import { z } from 'zod';
import { FirmDisciplinaryKind } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.coerce.number().min(0);
const percent = z.coerce.number().min(0).max(100);

// --- Financial (one row per firm; saved with "upsert") -----------------------
export const firmFinancialSchema = z.object({
  paidUpCapital: money,
  annualTurnover: money,
  currency: z.string().length(3).default('PKR'),
  bankName: z.string().min(1).max(255),
  bankAccountNumber: z.string().min(1).max(60),
  taxStatus: z.string().min(1).max(60),
  lastAuditedOn: dateLike.optional(),
  remarks: z.string().max(5000).optional(),
});
export type FirmFinancialInput = z.infer<typeof firmFinancialSchema>;

// --- Items catalog -----------------------------------------------------------
const firmItemBase = z.object({
  itemName: z.string().min(1).max(255),
  itemCode: z.string().max(60).optional(),
  category: z.string().min(1).max(120),
});
export const createFirmItemSchema = firmItemBase;
export const updateFirmItemSchema = firmItemBase.partial();
export type CreateFirmItemInput = z.infer<typeof createFirmItemSchema>;
export type UpdateFirmItemInput = z.infer<typeof updateFirmItemSchema>;

// --- Signatories -------------------------------------------------------------
const firmSignatoryBase = z.object({
  personName: z.string().min(1).max(255),
  designation: z.string().min(1).max(120),
  phone: z.string().max(60).optional(),
  email: z.string().email().max(254).optional(),
  signatureImageKey: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});
export const createFirmSignatorySchema = firmSignatoryBase;
export const updateFirmSignatorySchema = firmSignatoryBase.partial();
export type CreateFirmSignatoryInput = z.infer<typeof createFirmSignatorySchema>;
export type UpdateFirmSignatoryInput = z.infer<typeof updateFirmSignatorySchema>;

// --- Partners ----------------------------------------------------------------
const firmPartnerBase = z.object({
  partnerName: z.string().min(1).max(255),
  shareholdingPercent: percent,
  leftOn: dateLike.optional(),
});
export const createFirmPartnerSchema = firmPartnerBase;
export const updateFirmPartnerSchema = firmPartnerBase.partial();
export type CreateFirmPartnerInput = z.infer<typeof createFirmPartnerSchema>;
export type UpdateFirmPartnerInput = z.infer<typeof updateFirmPartnerSchema>;

// --- Agent -------------------------------------------------------------------
const firmAgentBase = z.object({
  agentName: z.string().min(1).max(255),
  localAddress: z.string().min(1).max(500),
  commissionPercent: percent,
  agreementDocumentKey: z.string().max(500).optional(),
  agreementFrom: dateLike,
  agreementTo: dateLike.optional(),
});
export const createFirmAgentSchema = firmAgentBase.refine(
  (v) => !v.agreementTo || v.agreementTo.getTime() > v.agreementFrom.getTime(),
  { message: 'agreementTo must be after agreementFrom', path: ['agreementTo'] },
);
export const updateFirmAgentSchema = firmAgentBase.partial();
export type CreateFirmAgentInput = z.infer<typeof createFirmAgentSchema>;
export type UpdateFirmAgentInput = z.infer<typeof updateFirmAgentSchema>;

// --- Discipline (lighter than Blacklist) ---------------------------------------
const firmDisciplineBase = z.object({
  kind: z.nativeEnum(FirmDisciplinaryKind),
  issuedOn: dateLike,
  description: z.string().min(5).max(5000),
  documentKey: z.string().max(500).optional(),
});
export const createFirmDisciplineSchema = firmDisciplineBase;
export const updateFirmDisciplineSchema = firmDisciplineBase.partial();
export type CreateFirmDisciplineInput = z.infer<typeof createFirmDisciplineSchema>;
export type UpdateFirmDisciplineInput = z.infer<typeof updateFirmDisciplineSchema>;