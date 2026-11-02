import { describe, it, expect } from 'vitest';
import {
  openFMSSchema,
  recordLOASchema,
  acceptLOASchema,
  createDisposalSchema,
  awardLotSchema,
  fileAppealSchema,
  decideAppealSchema,
} from '@/interfaces/http/schemas/specialCases';

describe('special-case schemas', () => {
  describe('FMS', () => {
    it('openFMS requires indent + caseNumber + authority + LOR date', () => {
      expect(() => openFMSSchema.parse({})).toThrow();
      const parsed = openFMSSchema.parse({
        indentId: 'i1',
        caseNumber: 'FMS-2026-001',
        foreignAuthority: 'US DSCA',
        lorSubmittedOn: '2026-01-01',
      });
      expect(parsed.currency).toBe('USD');
    });

    it('recordLOA requires value, currency, receivedOn', () => {
      expect(() => recordLOASchema.parse({})).toThrow();
      const parsed = recordLOASchema.parse({
        loaReceivedOn: '2026-02-01',
        loaValue: 2_500_000,
        currency: 'USD',
      });
      expect(parsed.loaValue).toBe('2500000');
    });

    it('acceptLOA requires acceptance date', () => {
      expect(() => acceptLOASchema.parse({})).toThrow();
      const parsed = acceptLOASchema.parse({ loaAcceptedOn: '2026-02-15' });
      expect(parsed.loaAcceptedOn).toBeInstanceOf(Date);
    });
  });

  describe('Disposal', () => {
    it('requires reference, kind, description + at least one lot', () => {
      expect(() => createDisposalSchema.parse({
        reference: 'DISP-1',
        kind: 'AUCTION',
        description: 'Scrap vehicles',
        initiatedOn: '2026-02-01',
        lots: [],
      })).toThrow();
      const parsed = createDisposalSchema.parse({
        reference: 'DISP-1',
        kind: 'AUCTION',
        description: 'Scrap vehicles',
        initiatedOn: '2026-02-01',
        lots: [{ lotNumber: 1, description: 'Lot of 10 trucks' }],
      });
      expect(parsed.kind).toBe('AUCTION');
      expect(parsed.lots[0]?.currency).toBe('PKR');
    });

    it('rejects unknown disposal kinds', () => {
      expect(() => createDisposalSchema.parse({
        reference: 'DISP-1',
        kind: 'SMUGGLE',
        description: 'nope',
        initiatedOn: '2026-02-01',
        lots: [{ lotNumber: 1, description: 'Lot of 10 trucks' }],
      })).toThrow();
    });

    it('awardLot requires bid + bidder + awardedOn', () => {
      expect(() => awardLotSchema.parse({})).toThrow();
      const parsed = awardLotSchema.parse({
        winningBid: 50_000,
        winningBidderName: 'Local Scrap Co',
        awardedOn: '2026-02-20',
      });
      expect(parsed.currency).toBe('PKR');
    });
  });

  describe('Appeal', () => {
    it('file requires grievance + basis ≥ 10 chars', () => {
      expect(() => fileAppealSchema.parse({})).toThrow();
      expect(() => fileAppealSchema.parse({
        grievanceId: 'g1', filedOn: '2026-02-01', basis: 'short',
      })).toThrow();
      const parsed = fileAppealSchema.parse({
        grievanceId: 'g1',
        filedOn: '2026-02-01',
        basis: 'GRC overlooked the material procedural breach pleaded.',
      });
      expect(parsed.grievanceId).toBe('g1');
    });

    it('decide only accepts UPHELD or REJECTED', () => {
      expect(() => decideAppealSchema.parse({
        decision: 'PENDING',
        decidedOn: '2026-03-01',
        decisionText: 'ok ok ok',
      })).toThrow();
      const parsed = decideAppealSchema.parse({
        decision: 'UPHELD',
        decidedOn: '2026-03-01',
        decisionText: 'The appeal is upheld on due-process grounds.',
      });
      expect(parsed.decision).toBe('UPHELD');
    });
  });
});
