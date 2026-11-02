import { describe, it, expect } from 'vitest';
import {
  openRiskPurchaseSchema,
  linkReplacementSchema,
  settleRiskPurchaseSchema,
  closeRiskPurchaseSchema,
  createFrameworkSchema,
  createCallOffSchema,
  cancelCallOffSchema,
} from '@/interfaces/http/schemas/frameworks';

describe('frameworks + risk purchase schemas', () => {
  it('open risk purchase requires original contract + reason ≥ 10 chars', () => {
    expect(() => openRiskPurchaseSchema.parse({})).toThrow();
    expect(() => openRiskPurchaseSchema.parse({
      originalContractId: 'c1',
      triggerReason: 'short',
      initiatedOn: '2026-01-01',
    })).toThrow();
    const parsed = openRiskPurchaseSchema.parse({
      originalContractId: 'c1',
      triggerReason: 'Supplier failed to deliver by DP + 2 months.',
      initiatedOn: '2026-01-01',
    });
    expect(parsed.triggerReason).toContain('failed');
  });

  it('link-replacement requires at least one of indent/contract', () => {
    expect(() => linkReplacementSchema.parse({})).toThrow();
    const parsed = linkReplacementSchema.parse({ replacementIndentId: 'i1' });
    expect(parsed.replacementIndentId).toBe('i1');
  });

  it('settle requires amount + settledOn', () => {
    expect(() => settleRiskPurchaseSchema.parse({})).toThrow();
    const parsed = settleRiskPurchaseSchema.parse({ riskSettled: 50000, settledOn: '2026-03-01' });
    expect(parsed.riskSettled).toBe('50000');
    expect(parsed.currency).toBe('PKR');
  });

  it('close requires closedOn', () => {
    expect(() => closeRiskPurchaseSchema.parse({})).toThrow();
    expect(closeRiskPurchaseSchema.parse({ closedOn: '2026-04-01' }).closedOn).toBeInstanceOf(Date);
  });

  it('create framework requires at least one firm', () => {
    expect(() => createFrameworkSchema.parse({
      reference: 'FW-1',
      kind: 'OPEN',
      name: 'Spares framework',
      validFrom: '2026-01-01',
      validTo: '2027-01-01',
      firmIds: [],
    })).toThrow();
    const parsed = createFrameworkSchema.parse({
      reference: 'FW-1',
      kind: 'OPEN',
      name: 'Spares framework',
      validFrom: '2026-01-01',
      validTo: '2027-01-01',
      firmIds: ['f1'],
    });
    expect(parsed.category).toBe('GOODS');
  });

  it('createCallOff requires framework, firm, callOffNumber, amount, placedOn', () => {
    expect(() => createCallOffSchema.parse({})).toThrow();
    const parsed = createCallOffSchema.parse({
      frameworkAgreementId: 'fw1',
      firmId: 'f1',
      callOffNumber: 'CO-001',
      description: 'Set of 10 widgets',
      amount: 1500,
      placedOn: '2026-02-01',
    });
    expect(parsed.amount).toBe('1500');
  });

  it('cancelCallOff requires reason ≥ 5 chars', () => {
    expect(() => cancelCallOffSchema.parse({ cancelledOn: '2026-03-01', cancelledReason: 'no' })).toThrow();
    const parsed = cancelCallOffSchema.parse({ cancelledOn: '2026-03-01', cancelledReason: 'Supplier out of stock.' });
    expect(parsed.cancelledReason).toContain('stock');
  });
});
