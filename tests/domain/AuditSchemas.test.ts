import { describe, expect, it } from 'vitest';
import {
  addDraftParaSchema,
  addItemSchema,
  addObjectionSchema,
  createAuditRecordSchema,
  formatMinor2,
  linkItemObjectionSchema,
  parseAmountToMinor,
  replyItemSchema,
  replyObjectionSchema,
} from '@/interfaces/http/schemas/audit';

describe('parseAmountToMinor / formatMinor2', () => {
  it('converts decimal text to 10^-4 minor units without floating point', () => {
    expect(parseAmountToMinor('1')).toBe(10_000n);
    expect(parseAmountToMinor('1234.5')).toBe(12_345_000n);
    expect(parseAmountToMinor('0.0001')).toBe(1n);
    expect(parseAmountToMinor('99999999999999.9999')).toBe(999_999_999_999_999_999n);
  });

  it('formats minor units with 2 decimals (half-up) and thousands separators', () => {
    expect(formatMinor2(12_345_000n)).toBe('1,234.50');
    expect(formatMinor2(12_345n)).toBe('1.23');
    expect(formatMinor2(12_350n)).toBe('1.24');
    expect(formatMinor2(0n)).toBe('0.00');
    expect(formatMinor2(999_999_999_999_999_999n)).toBe('100,000,000,000,000.00');
  });
});

describe('createAuditRecordSchema', () => {
  const base = { auditSection: 'DG Audit Defence Services', fiscalYearId: 'fy1', raisedOn: '2026-11-18' };

  it('accepts a minimal record; blank subjects count as not set', () => {
    const r = createAuditRecordSchema.parse({ ...base, subjectIndentId: '', subjectContractId: '' });
    expect(r.subjectIndentId).toBeUndefined();
    expect(r.subjectContractId).toBeUndefined();
    expect(r.raisedOn).toBeInstanceOf(Date);
  });

  it('requires section, fiscal year and a valid date', () => {
    expect(() => createAuditRecordSchema.parse({ ...base, auditSection: ' ' })).toThrow();
    expect(() => createAuditRecordSchema.parse({ ...base, fiscalYearId: '' })).toThrow();
    expect(() => createAuditRecordSchema.parse({ ...base, raisedOn: 'nope' })).toThrow();
  });
});

describe('addObjectionSchema', () => {
  const base = { ground: 'Purchase made without competitive bidding', para: '12(a)' };

  it('with no amount, stores neither amount nor currency', () => {
    const r = addObjectionSchema.parse({ ...base, currency: 'USD' });
    expect(r.amountInvolvedMinor).toBeNull();
    expect(r.currency).toBeNull();
  });

  it('parses the amount to minor units and defaults currency to PKR', () => {
    const r = addObjectionSchema.parse({ ...base, amountInvolved: '1234567.5' });
    expect(r.amountInvolvedMinor).toBe(12_345_675_000n);
    expect(r.currency).toBe('PKR');
    expect(addObjectionSchema.parse({ ...base, amountInvolved: '10', currency: 'usd' }).currency).toBe('USD');
  });

  it('accepts numbers that are inexact in floating point', () => {
    expect(addObjectionSchema.parse({ ...base, amountInvolved: 1.15 }).amountInvolvedMinor).toBe(11_500n);
    expect(addObjectionSchema.parse({ ...base, amountInvolved: 4.35 }).amountInvolvedMinor).toBe(43_500n);
  });

  it('rejects zero, negative, too many digits/decimals, bad currency', () => {
    for (const amountInvolved of ['0', '0.00', '-1', '1.23456', '123456789012345', '1,000', 'abc']) {
      expect(() => addObjectionSchema.parse({ ...base, amountInvolved })).toThrow();
    }
    expect(() => addObjectionSchema.parse({ ...base, amountInvolved: '10', currency: 'RUPEE' })).toThrow();
  });

  it('requires a ground of at least 5 characters and a para', () => {
    expect(() => addObjectionSchema.parse({ ...base, ground: 'bad' })).toThrow();
    expect(() => addObjectionSchema.parse({ ...base, para: ' ' })).toThrow();
  });
});

describe('reply / item / para / link schemas', () => {
  it('require non-blank reply text', () => {
    expect(replyObjectionSchema.parse({ replyText: 'Bids were invited.' }).repliedOn).toBeUndefined();
    expect(() => replyObjectionSchema.parse({ replyText: ' ' })).toThrow();
    expect(() => replyItemSchema.parse({ replyText: '' })).toThrow();
  });

  it('item, draft para and link inputs', () => {
    expect(addItemSchema.parse({ itemText: '  Missing receipts  ' }).itemText).toBe('Missing receipts');
    expect(addDraftParaSchema.parse({ paraText: 'Draft para 1', submittedOn: '2026-11-18' }).submittedOn).toBeInstanceOf(Date);
    expect(() => addDraftParaSchema.parse({ paraText: 'Draft para 1' })).toThrow();
    expect(() => linkItemObjectionSchema.parse({ auditObjectionId: '' })).toThrow();
  });
});
