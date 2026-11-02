import { describe, it, expect } from 'vitest';
import { terminateContractSchema } from '@/interfaces/http/schemas/contractTermination';

describe('contract termination schema', () => {
  it('requires terminationReason ≥ 10 chars and initiatedOn', () => {
    expect(() => terminateContractSchema.parse({})).toThrow();
    expect(() => terminateContractSchema.parse({ terminationReason: 'short', initiatedOn: '2026-02-01' })).toThrow();
    const parsed = terminateContractSchema.parse({
      terminationReason: 'Supplier abandoned the project after accepting LOA.',
      initiatedOn: '2026-02-01',
    });
    expect(parsed.openRiskPurchaseCase).toBe(true);
    expect(parsed.initiatedOn).toBeInstanceOf(Date);
  });

  it('allows explicitly skipping the risk-purchase case', () => {
    const parsed = terminateContractSchema.parse({
      terminationReason: 'Mutual termination for convenience.',
      initiatedOn: '2026-02-01',
      openRiskPurchaseCase: false,
    });
    expect(parsed.openRiskPurchaseCase).toBe(false);
  });
});
