import { describe, it, expect } from 'vitest';
import { CST } from '@/domain/cst/CST';
import { CSTStatus } from '@/domain/cst/CSTStatus';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '@/domain/errors/DomainError';

const NOW = new Date('2026-09-01T09:00:00Z');
const PREP = 'U-SEC';

let seq = 0;
const idf = () => `L-${++seq}`;

const line = (offerId: string, firmId: string, rank: number, rec: boolean) => ({
  commercialOfferId: offerId,
  firmId,
  rank,
  recommendedForAward: rec,
});

describe('CST', () => {
  it('creates with multiple ranked lines, exactly one recommendation', () => {
    const cst = CST.create(
      'CST-1',
      { itPerformaId: 'IT-1', preparedByUserId: PREP, singleQuote: false },
      idf,
      [
        line('OF-1', 'FR-1', 1, true),
        line('OF-2', 'FR-2', 2, false),
      ],
      NOW,
    );
    expect(cst.status).toBe(CSTStatus.DRAFT);
    expect(cst.lines).toHaveLength(2);
    expect(cst.recommendedAward()).toEqual({ commercialOfferId: 'OF-1', firmId: 'FR-1' });
  });

  it('refuses zero recommendations', () => {
    expect(() =>
      CST.create('CST-X', { itPerformaId: 'IT', preparedByUserId: PREP, singleQuote: false }, idf, [
        line('OF-1', 'FR-1', 1, false),
      ], NOW),
    ).toThrowError(BusinessRuleViolationError);
  });

  it('refuses two recommendations', () => {
    expect(() =>
      CST.create('CST-X', { itPerformaId: 'IT', preparedByUserId: PREP, singleQuote: false }, idf, [
        line('OF-1', 'FR-1', 1, true),
        line('OF-2', 'FR-2', 2, true),
      ], NOW),
    ).toThrowError(BusinessRuleViolationError);
  });

  it('refuses duplicate ranks', () => {
    expect(() =>
      CST.create('CST-X', { itPerformaId: 'IT', preparedByUserId: PREP, singleQuote: false }, idf, [
        line('OF-1', 'FR-1', 1, true),
        line('OF-2', 'FR-2', 1, false),
      ], NOW),
    ).toThrowError(BusinessRuleViolationError);
  });

  it('refuses zero lines', () => {
    expect(() =>
      CST.create('CST-X', { itPerformaId: 'IT', preparedByUserId: PREP, singleQuote: false }, idf, [], NOW),
    ).toThrowError(ValidationError);
  });

  it('lifecycle DRAFT → IN_APPROVAL → APPROVED', () => {
    const cst = CST.create(
      'CST-2',
      { itPerformaId: 'IT-1', preparedByUserId: PREP, singleQuote: false },
      idf,
      [line('OF-1', 'FR-1', 1, true)],
      NOW,
    );
    cst.startApproval(PREP);
    expect(cst.status).toBe(CSTStatus.IN_APPROVAL);
    cst.markChainApproved('U-DD', NOW);
    expect(cst.status).toBe(CSTStatus.APPROVED);
    expect(cst.approvedAt).toEqual(NOW);
    expect(() => cst.startApproval(PREP)).toThrowError(InvalidStateTransitionError);
  });
});
