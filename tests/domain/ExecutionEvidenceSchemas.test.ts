import { describe, it, expect } from 'vitest';
import {
  createInsuranceSchema,
  createShipmentSchema,
  markShipmentReceivedSchema,
  createEndUserCertificateSchema,
  createAgentCommissionSchema,
  approveAgentCommissionSchema,
} from '@/interfaces/http/schemas/executionEvidence';

describe('execution evidence schemas', () => {
  describe('insurance', () => {
    it('requires contractId, kind, cover dates, premium', () => {
      expect(() => createInsuranceSchema.parse({})).toThrow();
      const parsed = createInsuranceSchema.parse({
        contractId: 'c1',
        kind: 'MARINE',
        policyNumber: 'MP-001',
        insurer: 'Acme Marine Ltd',
        coverFromDate: '2026-01-01',
        coverToDate: '2026-12-31',
        premium: 10000,
      });
      expect(parsed.currency).toBe('PKR');
      expect(parsed.premium).toBe('10000');
    });
    it('rejects unknown insurance kinds', () => {
      expect(() => createInsuranceSchema.parse({
        contractId: 'c1',
        kind: 'LIFE',
        policyNumber: 'X',
        insurer: 'Y',
        coverFromDate: '2026-01-01',
        coverToDate: '2026-12-31',
        premium: 1,
      })).toThrow();
    });
  });

  describe('shipment', () => {
    it('requires mode, blAwbNumber, dispatchedOn', () => {
      expect(() => createShipmentSchema.parse({ contractId: 'c1' })).toThrow();
      const parsed = createShipmentSchema.parse({
        contractId: 'c1',
        mode: 'SEA',
        blAwbNumber: 'BL-12345',
        dispatchedOn: '2026-02-01',
      });
      expect(parsed.mode).toBe('SEA');
    });
    it('mark-received requires receivedOn', () => {
      expect(() => markShipmentReceivedSchema.parse({})).toThrow();
      const parsed = markShipmentReceivedSchema.parse({ receivedOn: '2026-03-10' });
      expect(parsed.receivedOn).toBeInstanceOf(Date);
    });
  });

  describe('EUC', () => {
    it('requires end-user org + controlled-goods description ≥ 5 chars', () => {
      expect(() => createEndUserCertificateSchema.parse({
        contractId: 'c1', issuedOn: '2026-02-01', endUserOrganisation: 'X',
        controlledGoodsDesc: 'no',
      })).toThrow();
      const parsed = createEndUserCertificateSchema.parse({
        contractId: 'c1',
        issuedOn: '2026-02-01',
        endUserOrganisation: 'Pakistan Navy, DP(N) HQ',
        controlledGoodsDesc: 'Radar components under export control category 5B002.',
      });
      expect(parsed.endUserOrganisation).toContain('Navy');
    });
  });

  describe('agent commission', () => {
    it('requires agentName, percent, amount, disclosedOn', () => {
      expect(() => createAgentCommissionSchema.parse({})).toThrow();
      const parsed = createAgentCommissionSchema.parse({
        contractId: 'c1',
        agentName: 'Local Rep Co',
        percent: 2.5,
        amount: 50000,
        disclosedOn: '2026-02-01',
      });
      expect(parsed.percent).toBe('2.5');
      expect(parsed.amount).toBe('50000');
    });
    it('approve requires approvedOn', () => {
      expect(() => approveAgentCommissionSchema.parse({})).toThrow();
      const parsed = approveAgentCommissionSchema.parse({ approvedOn: '2026-02-15' });
      expect(parsed.approvedOn).toBeInstanceOf(Date);
    });
  });
});
