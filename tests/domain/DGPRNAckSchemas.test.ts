import { describe, expect, it } from 'vitest';
import { LINK_REQUIRED_MESSAGE, createDGPRNAckSchema } from '@/interfaces/http/schemas/dgprnAck';

const base = { receivedOn: '2026-11-18', referenceNumber: 'DGPR(N)/ACK/2026/17' };

describe('createDGPRNAckSchema', () => {
  it('accepts a link to an invoice only, an IT Proforma only, or both', () => {
    expect(createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1' }).invoiceId).toBe('inv1');
    expect(createDGPRNAckSchema.parse({ ...base, itPerformaId: 'it1' }).itPerformaId).toBe('it1');
    const both = createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1', itPerformaId: 'it1' });
    expect([both.invoiceId, both.itPerformaId]).toEqual(['inv1', 'it1']);
  });

  it('requires at least one link, with a clear message', () => {
    const r = createDGPRNAckSchema.safeParse(base);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.message).toBe(LINK_REQUIRED_MESSAGE);
  });

  it('treats blank dropdown values as "not set"', () => {
    expect(createDGPRNAckSchema.safeParse({ ...base, invoiceId: '', itPerformaId: '' }).success).toBe(false);
    const r = createDGPRNAckSchema.parse({ ...base, invoiceId: '', itPerformaId: 'it1' });
    expect(r.invoiceId).toBeUndefined();
    expect(r.itPerformaId).toBe('it1');
  });

  it('requires a reference number (trimmed, max 80) and a valid date', () => {
    expect(createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1', referenceNumber: '  REF-1  ' }).referenceNumber).toBe('REF-1');
    expect(() => createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1', referenceNumber: '   ' })).toThrow();
    expect(() => createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1', referenceNumber: 'x'.repeat(81) })).toThrow();
    expect(() => createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1', receivedOn: 'not-a-date' })).toThrow();
    expect(createDGPRNAckSchema.parse({ ...base, invoiceId: 'inv1' }).receivedOn).toBeInstanceOf(Date);
  });
});
