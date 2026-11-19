import { z } from 'zod';

// PPRA Invoices (v4.4.1 §4.27, manual pp.166–174).

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

/** Up to 16 integer digits and 4 decimals — matches Decimal(20,4). */
export const AMOUNT_PATTERN = /^\d{1,16}(\.\d{1,4})?$/;

/**
 * Amount as a decimal STRING so it never goes through floating point on the
 * way to the DB. Numbers are accepted too: one within float rounding of 4
 * decimals (e.g. 1.15) is written out exactly with toFixed(4).
 */
const amountString = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === 'string') return v.trim();
    if (Number.isFinite(v) && Math.abs(Math.round(v * 10_000) - v * 10_000) < 1e-6) return v.toFixed(4);
    return String(v);
  })
  .pipe(
    z
      .string()
      .regex(AMOUNT_PATTERN, 'Use digits only, with at most 4 decimal places')
      .refine((s) => /[1-9]/.test(s), 'Amount must be greater than 0'),
  );

export const createPPRAInvoiceSchema = z.object({
  invoiceNumber: z.string().trim().min(1).max(60),
  receivedOn: dateLike,
  amount: amountString,
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code, e.g. PKR').default('PKR'),
  /** IT Proformas (tenders) this invoice covers — at least one. */
  itPerformaIds: z
    .array(z.string().min(1).max(26))
    .min(1, 'Select at least one IT Proforma')
    .max(100)
    .transform((ids) => [...new Set(ids)]),
  documentKey: z.string().max(500).optional(),
});
export type CreatePPRAInvoiceInput = z.infer<typeof createPPRAInvoiceSchema>;

export const returnPPRAInvoiceSchema = z.object({
  reason: z.string().trim().min(5).max(5000),
  returnedOn: dateLike.optional(),
});
export type ReturnPPRAInvoiceInput = z.infer<typeof returnPPRAInvoiceSchema>;

export const sendToDGPRNSchema = z.object({
  sentOn: dateLike.optional(),
});
export type SendToDGPRNInput = z.infer<typeof sendToDGPRNSchema>;

export const markPaidSchema = z.object({
  paidOn: dateLike.optional(),
});
export type MarkPaidInput = z.infer<typeof markPaidSchema>;
