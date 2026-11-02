import { describe, it, expect } from 'vitest';
import {
  submitFirmRegistrationSchema,
  approveFirmRegistrationSchema,
  rejectFirmRegistrationSchema,
  revokeFirmRegistrationSchema,
} from '@/interfaces/http/schemas/firmRegistration';

describe('firm registration schemas', () => {
  it('submit requires firmId, category and submittedOn', () => {
    expect(() => submitFirmRegistrationSchema.parse({})).toThrow();
    const parsed = submitFirmRegistrationSchema.parse({
      firmId: 'f1',
      category: 'GOODS',
      submittedOn: '2026-01-01',
    });
    expect(parsed.submittedOn).toBeInstanceOf(Date);
    expect(parsed.certificateKey).toBeUndefined();
  });
  it('submit rejects unknown categories', () => {
    expect(() => submitFirmRegistrationSchema.parse({
      firmId: 'f1',
      category: 'SPACESHIPS',
      submittedOn: '2026-01-01',
    })).toThrow();
  });

  it('approve requires issuedOn + validUntil', () => {
    expect(() => approveFirmRegistrationSchema.parse({ issuedOn: '2026-01-01' })).toThrow();
    const parsed = approveFirmRegistrationSchema.parse({
      issuedOn: '2026-01-01',
      validUntil: '2027-01-01',
      reviewNotes: 'All documents in order.',
    });
    expect(parsed.validUntil).toBeInstanceOf(Date);
  });

  it('reject requires reviewNotes >= 5 chars', () => {
    expect(() => rejectFirmRegistrationSchema.parse({ reviewNotes: 'no' })).toThrow();
    const parsed = rejectFirmRegistrationSchema.parse({ reviewNotes: 'Missing tax return.' });
    expect(parsed.reviewNotes).toBe('Missing tax return.');
  });

  it('revoke requires revokedOn + reason', () => {
    expect(() => revokeFirmRegistrationSchema.parse({ revokedOn: '2026-01-01' })).toThrow();
    const parsed = revokeFirmRegistrationSchema.parse({ revokedOn: '2026-01-01', revokedReason: 'Policy breach.' });
    expect(parsed.revokedOn).toBeInstanceOf(Date);
  });
});
