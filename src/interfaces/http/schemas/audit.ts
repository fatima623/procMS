import { z } from 'zod';

// Audit Section — Audit Records, Objections, Items, Draft Paras (v4.4.1 §4.29–§4.30).

const dateLike = z
  .union([
    z.string().min(1).refine((s) => !Number.isNaN(Date.parse(s)), 'invalid date'),
    z.date(),
  ])
  .transform((v) => (v instanceof Date ? v : new Date(v)));

/** Optional id; an empty string (blank dropdown) counts as "not set". */
const optionalId = z
  .string()
  .trim()
  .max(26)
  .optional()
  .transform((v) => (v ? v : undefined));

// --- money ------------------------------------------------------------------

/**
 * Up to 14 integer digits and 4 decimals. 14 (not 16) because the value is
 * stored as BigInt minor units (×10^4, like domain/shared/Money) and MySQL
 * BIGINT tops out near 9.22 × 10^18.
 */
export const AMOUNT_PATTERN = /^\d{1,14}(\.\d{1,4})?$/;

/** "1234.5" → 12345000n. Pure string arithmetic — no floating point. Caller validates the pattern. */
export function parseAmountToMinor(amount: string): bigint {
  const [whole, frac = ''] = amount.split('.');
  return BigInt(whole) * 10_000n + BigInt(`${frac}0000`.slice(0, 4));
}

/** 12345000n → "1,234.50" (2 decimals, half-up). Display only; never written back. */
export function formatMinor2(minor: bigint): string {
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const hundredths = (abs + 50n) / 100n;
  const whole = (hundredths / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = (hundredths % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole}.${frac}`;
}

/** Amount as text; numbers within float rounding of 4 decimals (e.g. 1.15) are written out exactly. */
const amountText = z
  .union([z.string(), z.number()])
  .transform((v) => {
    if (typeof v === 'string') return v.trim();
    if (Number.isFinite(v) && Math.abs(Math.round(v * 10_000) - v * 10_000) < 1e-6) return v.toFixed(4);
    return String(v);
  });

// --- records ----------------------------------------------------------------

export const createAuditRecordSchema = z.object({
  auditSection: z.string().trim().min(2).max(120),
  fiscalYearId: z.string().trim().min(1).max(26),
  raisedOn: dateLike,
  subjectIndentId: optionalId,
  subjectContractId: optionalId,
  documentKey: z.string().max(500).optional(),
});
export type CreateAuditRecordInput = z.infer<typeof createAuditRecordSchema>;

// --- objections -------------------------------------------------------------

export const addObjectionSchema = z
  .object({
    ground: z.string().trim().min(5).max(10_000),
    para: z.string().trim().min(1).max(40),
    /** Optional. Blank = no amount involved. */
    amountInvolved: amountText.optional(),
    currency: z.string().trim().optional(),
  })
  .superRefine((d, ctx) => {
    if (d.amountInvolved) {
      if (!AMOUNT_PATTERN.test(d.amountInvolved)) {
        ctx.addIssue({ code: 'custom', path: ['amountInvolved'], message: 'Use digits only (max 14), with at most 4 decimal places' });
      } else if (!/[1-9]/.test(d.amountInvolved)) {
        ctx.addIssue({ code: 'custom', path: ['amountInvolved'], message: 'Amount must be greater than 0' });
      }
      if (d.currency && !/^[A-Za-z]{3}$/.test(d.currency)) {
        ctx.addIssue({ code: 'custom', path: ['currency'], message: 'Use a 3-letter currency code, e.g. PKR' });
      }
    }
  })
  .transform((d) => ({
    ground: d.ground,
    para: d.para,
    // Amount present → minor units + currency (default PKR). Absent → both null.
    amountInvolvedMinor: d.amountInvolved ? parseAmountToMinor(d.amountInvolved) : null,
    currency: d.amountInvolved ? (d.currency ? d.currency.toUpperCase() : 'PKR') : null,
  }));
export type AddObjectionInput = z.infer<typeof addObjectionSchema>;

export const replyObjectionSchema = z.object({
  replyText: z.string().trim().min(2).max(10_000),
  repliedOn: dateLike.optional(),
});
export type ReplyObjectionInput = z.infer<typeof replyObjectionSchema>;

// --- items ------------------------------------------------------------------

export const addItemSchema = z.object({
  itemText: z.string().trim().min(2).max(10_000),
});
export type AddItemInput = z.infer<typeof addItemSchema>;

export const replyItemSchema = z.object({
  replyText: z.string().trim().min(2).max(10_000),
});
export type ReplyItemInput = z.infer<typeof replyItemSchema>;

export const addDraftParaSchema = z.object({
  paraText: z.string().trim().min(2).max(20_000),
  submittedOn: dateLike,
});
export type AddDraftParaInput = z.infer<typeof addDraftParaSchema>;

export const linkItemObjectionSchema = z.object({
  auditObjectionId: z.string().trim().min(1).max(26),
});
export type LinkItemObjectionInput = z.infer<typeof linkItemObjectionSchema>;
