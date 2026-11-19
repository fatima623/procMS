import { describe, expect, it } from 'vitest';
import {
  createPPRAInvoiceSchema,
  markPaidSchema,
  returnPPRAInvoiceSchema,
  sendToDGPRNSchema,
} from '@/interfaces/http/schemas/ppraInvoice';

const base = {
  invoiceNumber: 'PPRA/INV/2026/0042',
  receivedOn: '2026-11-18',
  amount: '15000.00',
  itPerformaIds: ['it1'],
};

describe('createPPRAInvoiceSchema', () => {
  it('accepts a minimal invoice and defaults currency to PKR', () => {
    const r = createPPRAInvoiceSchema.parse(base);
    expect(r.currency).toBe('PKR');
    expect(r.amount).toBe('15000.00');
    expect(r.receivedOn).toBeInstanceOf(Date);
  });

  it('keeps the amount as an exact decimal string (up to 4 decimals)', () => {
    expect(createPPRAInvoiceSchema.parse({ ...base, amount: '1234567.5' }).amount).toBe('1234567.5');
    expect(createPPRAInvoiceSchema.parse({ ...base, amount: '0.0001' }).amount).toBe('0.0001');
    expect(createPPRAInvoiceSchema.parse({ ...base, amount: '9999999999999999.9999' }).amount).toBe('9999999999999999.9999');
  });

  it('accepts numbers that are inexact in floating point', () => {
    for (const n of [1.15, 0.29, 4.35, 1234.5678]) {
      expect(createPPRAInvoiceSchema.parse({ ...base, amount: n }).amount).toBe(n.toFixed(4));
    }
  });

  it('rejects zero, negative, more than 4 decimals, and non-numeric amounts', () => {
    for (const amount of ['0', '0.0000', '-5', '1.23456', '12,000', 'abc', '', 1.23456, 0]) {
      expect(() => createPPRAInvoiceSchema.parse({ ...base, amount })).toThrow();
    }
  });

  it('upper-cases and validates the currency code', () => {
    expect(createPPRAInvoiceSchema.parse({ ...base, currency: 'usd' }).currency).toBe('USD');
    expect(() => createPPRAInvoiceSchema.parse({ ...base, currency: 'RUPEES' })).toThrow();
  });

  it('requires at least one IT Proforma and removes duplicates', () => {
    expect(() => createPPRAInvoiceSchema.parse({ ...base, itPerformaIds: [] })).toThrow();
    expect(createPPRAInvoiceSchema.parse({ ...base, itPerformaIds: ['a', 'b', 'a'] }).itPerformaIds).toEqual(['a', 'b']);
  });

  it('requires an invoice number of at most 60 characters', () => {
    expect(() => createPPRAInvoiceSchema.parse({ ...base, invoiceNumber: '  ' })).toThrow();
    expect(() => createPPRAInvoiceSchema.parse({ ...base, invoiceNumber: 'x'.repeat(61) })).toThrow();
  });
});

describe('returnPPRAInvoiceSchema', () => {
  it('requires a reason of at least 5 characters; date is optional', () => {
    expect(returnPPRAInvoiceSchema.parse({ reason: 'Wrong tender reference' }).returnedOn).toBeUndefined();
    expect(returnPPRAInvoiceSchema.parse({ reason: 'Wrong amount', returnedOn: '2026-11-18' }).returnedOn).toBeInstanceOf(Date);
    expect(() => returnPPRAInvoiceSchema.parse({ reason: 'bad' })).toThrow();
    expect(() => returnPPRAInvoiceSchema.parse({})).toThrow();
  });
});

describe('sendToDGPRNSchema / markPaidSchema', () => {
  it('accept an optional valid date', () => {
    expect(sendToDGPRNSchema.parse({}).sentOn).toBeUndefined();
    expect(markPaidSchema.parse({ paidOn: '2026-11-18' }).paidOn).toBeInstanceOf(Date);
    expect(() => markPaidSchema.parse({ paidOn: 'not-a-date' })).toThrow();
  });
});
