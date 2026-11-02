import { describe, it, expect } from 'vitest';
import {
  createIncidentSchema,
  remediateIncidentSchema,
  reportIncidentToPPRASchema,
  placeRetentionHoldSchema,
  releaseRetentionHoldSchema,
} from '@/interfaces/http/schemas/transparency';

describe('transparency schemas', () => {
  it('createIncident requires rule, summary, details, detectedOn', () => {
    expect(() => createIncidentSchema.parse({})).toThrow();
    const parsed = createIncidentSchema.parse({
      ruleReference: 'PPRA Rule 12(2)',
      summary: 'No newspaper advertisement on a > 3M procurement.',
      details: 'The dispatched IT exceeded the 3,000,000 threshold but no NEWSPAPER row exists.',
      detectedOn: '2026-02-01',
    });
    expect(parsed.severity).toBe('MEDIUM');
  });

  it('remediate requires a date', () => {
    expect(() => remediateIncidentSchema.parse({})).toThrow();
    const parsed = remediateIncidentSchema.parse({ remediatedOn: '2026-02-10' });
    expect(parsed.remediatedOn).toBeInstanceOf(Date);
  });

  it('reportToPPRA requires a date', () => {
    const parsed = reportIncidentToPPRASchema.parse({ reportedToPPRAOn: '2026-02-15' });
    expect(parsed.reportedToPPRAOn).toBeInstanceOf(Date);
  });

  it('placeRetentionHold requires subject + reason + placedOn', () => {
    expect(() => placeRetentionHoldSchema.parse({})).toThrow();
    const parsed = placeRetentionHoldSchema.parse({
      subjectType: 'INDENT',
      subjectId: 'ab12',
      reason: 'LITIGATION',
      placedOn: '2026-01-01',
    });
    expect(parsed.reason).toBe('LITIGATION');
  });

  it('releaseRetentionHold requires releasedOn', () => {
    expect(() => releaseRetentionHoldSchema.parse({})).toThrow();
    const parsed = releaseRetentionHoldSchema.parse({ releasedOn: '2026-06-01' });
    expect(parsed.releasedOn).toBeInstanceOf(Date);
  });
});
