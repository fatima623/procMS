import { describe, expect, it } from 'vitest';
import {
  NEXT_HEARING_MESSAGE,
  addProceedingSchema,
  changeCourtCaseStatusSchema,
  createCourtCaseSchema,
} from '@/interfaces/http/schemas/legal';

describe('createCourtCaseSchema', () => {
  const base = {
    caseNumber: 'WP-1234/2026',
    court: 'Islamabad High Court',
    party: 'DP(N)',
    counterParty: 'Marine Systems (Pvt) Ltd',
    filedOn: '2026-11-18',
  };

  it('accepts a minimal case; blank related ids count as not set', () => {
    const r = createCourtCaseSchema.parse({ ...base, relatedIndentId: '', relatedContractId: '' });
    expect(r.relatedIndentId).toBeUndefined();
    expect(r.relatedContractId).toBeUndefined();
    expect(r.filedOn).toBeInstanceOf(Date);
  });

  it('trims fields and enforces lengths', () => {
    expect(createCourtCaseSchema.parse({ ...base, caseNumber: '  WP-1/2026  ' }).caseNumber).toBe('WP-1/2026');
    expect(() => createCourtCaseSchema.parse({ ...base, caseNumber: ' ' })).toThrow();
    expect(() => createCourtCaseSchema.parse({ ...base, caseNumber: 'x'.repeat(81) })).toThrow();
    expect(() => createCourtCaseSchema.parse({ ...base, court: 'x' })).toThrow();
    expect(() => createCourtCaseSchema.parse({ ...base, counterParty: '' })).toThrow();
    expect(() => createCourtCaseSchema.parse({ ...base, filedOn: 'nope' })).toThrow();
  });
});

describe('addProceedingSchema', () => {
  const base = { hearingDate: '2026-11-18', outcome: 'Adjourned' };

  it('accepts a hearing without a next date; blank next date counts as not set', () => {
    expect(addProceedingSchema.parse(base).nextHearingDate).toBeUndefined();
    expect(addProceedingSchema.parse({ ...base, nextHearingDate: '' }).nextHearingDate).toBeUndefined();
  });

  it('accepts a next hearing date after the hearing date', () => {
    expect(addProceedingSchema.parse({ ...base, nextHearingDate: '2026-12-02' }).nextHearingDate).toBeInstanceOf(Date);
  });

  it('rejects a next hearing date on or before the hearing date, with a clear message', () => {
    for (const nextHearingDate of ['2026-11-18', '2026-11-01']) {
      const r = addProceedingSchema.safeParse({ ...base, nextHearingDate });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error.issues[0]?.message).toBe(NEXT_HEARING_MESSAGE);
    }
  });

  it('requires an outcome of 2–500 characters', () => {
    expect(() => addProceedingSchema.parse({ ...base, outcome: ' ' })).toThrow();
    expect(() => addProceedingSchema.parse({ ...base, outcome: 'x'.repeat(501) })).toThrow();
  });
});

describe('changeCourtCaseStatusSchema', () => {
  it('allows only the two final statuses', () => {
    expect(changeCourtCaseStatusSchema.parse({ status: 'CLOSED' }).status).toBe('CLOSED');
    expect(changeCourtCaseStatusSchema.parse({ status: 'DISPOSED_OFF' }).status).toBe('DISPOSED_OFF');
    expect(() => changeCourtCaseStatusSchema.parse({ status: 'PENDING' })).toThrow();
    expect(() => changeCourtCaseStatusSchema.parse({})).toThrow();
  });
});
