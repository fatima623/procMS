import { describe, it, expect } from 'vitest';
import { PurchaseRequisition } from '@/domain/pr/PurchaseRequisition';
import { PRStatus } from '@/domain/pr/PRStatus';
import { Money } from '@/domain/shared/Money';
import {
  InvalidStateTransitionError,
  ValidationError,
} from '@/domain/errors/DomainError';

const NOW = new Date('2026-10-01T09:00:00Z');

function fresh(): PurchaseRequisition {
  return PurchaseRequisition.create(
    'PR-1',
    {
      cstId: 'CST-1',
      firmId: 'FR-1',
      prNumber: 'PR/2026/00001',
      amount: Money.of(1_000_0000n, 'PKR'),
    },
    NOW,
  );
}

describe('PurchaseRequisition', () => {
  it('creates in DRAFT', () => {
    const pr = fresh();
    expect(pr.status).toBe(PRStatus.DRAFT);
    expect(pr.faxedAt).toBeNull();
  });

  it('refuses bad PR number format', () => {
    expect(() =>
      PurchaseRequisition.create(
        'PR-X',
        { cstId: 'C', firmId: 'F', prNumber: 'bad', amount: Money.of(1n, 'PKR') },
        NOW,
      ),
    ).toThrowError(ValidationError);
  });

  it('lifecycle DRAFT → SENT → ACKNOWLEDGED → CLOSED', () => {
    const pr = fresh();
    pr.send('U-SEC', NOW);
    expect(pr.status).toBe(PRStatus.SENT);
    expect(pr.faxedAt).toEqual(NOW);
    pr.acknowledge('U-FIRM');
    expect(pr.status).toBe(PRStatus.ACKNOWLEDGED);
    pr.close('U-SEC');
    expect(pr.status).toBe(PRStatus.CLOSED);
    expect(() => pr.close('U-SEC')).toThrowError(InvalidStateTransitionError);
  });

  it('may be closed directly from SENT (acknowledgement optional)', () => {
    const pr = fresh();
    pr.send('U-SEC', NOW);
    pr.close('U-SEC');
    expect(pr.status).toBe(PRStatus.CLOSED);
  });
});
