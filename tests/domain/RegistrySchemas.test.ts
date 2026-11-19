import { describe, expect, it } from 'vitest';
import {
  addMinuteSchema,
  assignCorrespondenceSchema,
  createCorrespondenceSchema,
  createPostalStampSchema,
} from '@/interfaces/http/schemas/registry';

const base = {
  direction: 'INWARD',
  subject: 'Quotation for spare pumps',
  fromParty: 'Marine Systems (Pvt) Ltd',
  toParty: 'DP(N)',
  receivedOrSentOn: '2026-11-18',
};

describe('createCorrespondenceSchema', () => {
  it('accepts a letter without a control number (auto-numbered later)', () => {
    const r = createCorrespondenceSchema.parse(base);
    expect(r.controlNumber).toBeUndefined();
    expect(r.receivedOrSentOn).toBeInstanceOf(Date);
  });

  it('upper-cases and accepts a manual control number', () => {
    const r = createCorrespondenceSchema.parse({ ...base, controlNumber: 'cr/in/2026/00042' });
    expect(r.controlNumber).toBe('CR/IN/2026/00042');
  });

  it('rejects a control number with spaces or bad characters', () => {
    expect(() => createCorrespondenceSchema.parse({ ...base, controlNumber: 'CR IN 1' })).toThrow();
    expect(() => createCorrespondenceSchema.parse({ ...base, controlNumber: 'CR#1' })).toThrow();
  });

  it('rejects an unknown direction and a bad date', () => {
    expect(() => createCorrespondenceSchema.parse({ ...base, direction: 'SIDEWAYS' })).toThrow();
    expect(() => createCorrespondenceSchema.parse({ ...base, receivedOrSentOn: 'not-a-date' })).toThrow();
  });
});

describe('assignCorrespondenceSchema', () => {
  it('allows null to clear the assignment', () => {
    expect(assignCorrespondenceSchema.parse({ assignedToUserId: null }).assignedToUserId).toBeNull();
  });
});

describe('addMinuteSchema', () => {
  it('accepts IMF and EMF only', () => {
    expect(addMinuteSchema.parse({ kind: 'IMF', text: 'Forwarded to DD' }).kind).toBe('IMF');
    expect(addMinuteSchema.parse({ kind: 'EMF', text: 'Reply sent' }).kind).toBe('EMF');
    expect(() => addMinuteSchema.parse({ kind: 'XMF', text: 'x x' })).toThrow();
  });
});

describe('createPostalStampSchema', () => {
  it('coerces numbers from form strings', () => {
    const r = createPostalStampSchema.parse({ denomination: '50', quantity: '10', usedOn: '2026-11-18' });
    expect(r.denomination).toBe(50);
    expect(r.quantity).toBe(10);
  });

  it('accepts 2-decimal values that are inexact in floating point', () => {
    for (const d of [1.15, 0.29, 4.35, '1.15']) {
      expect(createPostalStampSchema.parse({ denomination: d, quantity: 1, usedOn: '2026-11-18' }).denomination).toBeCloseTo(Number(d));
    }
  });

  it('rejects zero/negative values and more than 2 decimals', () => {
    expect(() => createPostalStampSchema.parse({ denomination: 0, quantity: 1, usedOn: '2026-11-18' })).toThrow();
    expect(() => createPostalStampSchema.parse({ denomination: 10, quantity: -1, usedOn: '2026-11-18' })).toThrow();
    expect(() => createPostalStampSchema.parse({ denomination: 10.555, quantity: 1, usedOn: '2026-11-18' })).toThrow();
  });
});
