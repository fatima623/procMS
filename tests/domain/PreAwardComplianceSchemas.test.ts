import { describe, it, expect } from 'vitest';
import { rejectAllOffersSchema } from '@/interfaces/http/schemas/rebidding';
import { setBidValiditySchema } from '@/interfaces/http/schemas/bidValidity';

describe('pre-award compliance schemas', () => {
  it('rejectAllOffersSchema requires reason ≥ 10 chars', () => {
    expect(() => rejectAllOffersSchema.parse({ reason: 'short' })).toThrow();
    const parsed = rejectAllOffersSchema.parse({ reason: 'Bids received were not responsive to the specs.' });
    expect(parsed.reason).toContain('responsive');
  });

  it('setBidValiditySchema requires a date', () => {
    expect(() => setBidValiditySchema.parse({})).toThrow();
    const parsed = setBidValiditySchema.parse({ bidValidUntil: '2026-06-30' });
    expect(parsed.bidValidUntil).toBeInstanceOf(Date);
  });
});
