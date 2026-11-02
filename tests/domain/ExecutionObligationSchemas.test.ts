import { describe, it, expect } from 'vitest';
import {
  extendDPSchema,
  assessLDSchema,
  recordInspectionSchema,
  raiseDiscrepancySchema,
  resolveDiscrepancySchema,
} from '@/interfaces/http/schemas/executionObligations';

describe('execution obligation schemas', () => {
  describe('extendDPSchema', () => {
    it('requires contractId, newDP, reason, grantedOn', () => {
      expect(() => extendDPSchema.parse({})).toThrow();
      expect(() => extendDPSchema.parse({
        contractId: 'c1',
        newDP: '2026-03-01',
        reason: 'short',
        grantedOn: '2026-02-15',
      })).toThrow();
      const parsed = extendDPSchema.parse({
        contractId: 'c1',
        newDP: '2026-03-01',
        reason: 'Force majeure delay recorded by the Inspectorate.',
        grantedOn: '2026-02-15',
      });
      expect(parsed.newDP).toBeInstanceOf(Date);
    });
  });

  describe('assessLDSchema', () => {
    it('defaults basis to PER_MONTH and currency to PKR', () => {
      const parsed = assessLDSchema.parse({
        contractId: 'c1',
        assessedOn: '2026-02-01',
        periodFrom: '2026-01-01',
        periodTo: '2026-01-31',
        amount: 100000,
      });
      expect(parsed.basis).toBe('PER_MONTH');
      expect(parsed.currency).toBe('PKR');
      expect(parsed.amount).toBe('100000');
    });
    it('rejects unknown basis', () => {
      expect(() => assessLDSchema.parse({
        contractId: 'c1',
        assessedOn: '2026-02-01',
        periodFrom: '2026-01-01',
        periodTo: '2026-01-31',
        basis: 'PER_HOUR',
        amount: 100,
      })).toThrow();
    });
  });

  describe('recordInspectionSchema', () => {
    it('requires contractId, performedOn, verdict, summary', () => {
      expect(() => recordInspectionSchema.parse({})).toThrow();
      const parsed = recordInspectionSchema.parse({
        contractId: 'c1',
        performedOn: '2026-02-01',
        verdict: 'ACCEPTED',
        summary: 'All items received as per spec.',
      });
      expect(parsed.verdict).toBe('ACCEPTED');
    });
    it('rejects unknown verdict', () => {
      expect(() => recordInspectionSchema.parse({
        contractId: 'c1',
        performedOn: '2026-02-01',
        verdict: 'PENDING',
        summary: 'ok',
      })).toThrow();
    });
  });

  describe('raiseDiscrepancySchema', () => {
    it('defaults severity to MAJOR', () => {
      const parsed = raiseDiscrepancySchema.parse({
        inspectionId: 'i1',
        raisedOn: '2026-02-01',
        description: 'Serial number mismatch on 3 units.',
      });
      expect(parsed.severity).toBe('MAJOR');
    });
    it('rejects unknown severity', () => {
      expect(() => raiseDiscrepancySchema.parse({
        inspectionId: 'i1',
        raisedOn: '2026-02-01',
        description: 'ok',
        severity: 'URGENT',
      })).toThrow();
    });
  });

  describe('resolveDiscrepancySchema', () => {
    it('defaults outcome to RESOLVED', () => {
      const parsed = resolveDiscrepancySchema.parse({
        resolvedOn: '2026-02-10',
        resolutionNotes: 'Items replaced on 2026-02-09.',
      });
      expect(parsed.outcome).toBe('RESOLVED');
    });
    it('allows WAIVED as outcome', () => {
      const parsed = resolveDiscrepancySchema.parse({
        resolvedOn: '2026-02-10',
        resolutionNotes: 'Waived — stores still functional for purpose.',
        outcome: 'WAIVED',
      });
      expect(parsed.outcome).toBe('WAIVED');
    });
    it('rejects outcome PENDING or OPEN', () => {
      expect(() => resolveDiscrepancySchema.parse({
        resolvedOn: '2026-02-10',
        resolutionNotes: 'ok',
        outcome: 'OPEN',
      })).toThrow();
    });
  });
});
