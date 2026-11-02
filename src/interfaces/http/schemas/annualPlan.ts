import { z } from 'zod';
import { ProcurementCategory, ProcurementMethod, BiddingDocumentKind } from '@prisma/client';

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

const money = z.union([z.string().min(1), z.number().positive()]).transform((v) => String(v));

// --- Annual Procurement Plan (PPRA Rule 8) ----------------------------------

export const createAnnualPlanSchema = z.object({
  fiscalYearId: z.string().min(1),
  notes: z.string().max(5000).optional(),
  items: z
    .array(z.object({
      budgetHeadId: z.string().min(1),
      description: z.string().min(3).max(500),
      estimatedValue: money,
      currency: z.string().length(3).default('PKR'),
      methodHint: z.nativeEnum(ProcurementMethod).optional(),
      categoryHint: z.nativeEnum(ProcurementCategory).optional(),
      quarterHint: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
    }))
    .min(1)
    .max(500),
});
export type CreateAnnualPlanInput = z.infer<typeof createAnnualPlanSchema>;

export const publishAnnualPlanSchema = z.object({
  publishedOn: dateLike,
});
export type PublishAnnualPlanInput = z.infer<typeof publishAnnualPlanSchema>;

// --- Bidding Document Templates (PPRA Rule 23(4)) ---------------------------

export const createBiddingTemplateSchema = z.object({
  kind: z.nativeEnum(BiddingDocumentKind),
  name: z.string().min(3).max(200),
  revision: z.string().min(1).max(40),
  publishedOn: dateLike,
  bodyKey: z.string().max(500).optional(),
  summary: z.string().max(5000).optional(),
});
export type CreateBiddingTemplateInput = z.infer<typeof createBiddingTemplateSchema>;

export const retireBiddingTemplateSchema = z.object({
  reason: z.string().max(2000).optional(),
});
export type RetireBiddingTemplateInput = z.infer<typeof retireBiddingTemplateSchema>;
