import { describe, it, expect } from 'vitest';
import { ITPerforma } from '@/domain/itproforma/ITPerforma';
import { ITStatus } from '@/domain/itproforma/ITStatus';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '@/domain/errors/DomainError';

const NOW = new Date('2026-07-01T09:00:00Z');
const PREPARER = 'U-ADP';
const F1 = '01HFIRMAAAAAAAAAAAAAAAAAAA';
const F2 = '01HFIRMBBBBBBBBBBBBBBBBBBB';

function make(firms: string[] = [F1, F2]): ITPerforma {
  return ITPerforma.create(
    'IT-1',
    {
      indentId: 'IND-1',
      reference: 'IT/2026/00001',
      checklist: { completeness: true },
      preparedByUserId: PREPARER,
    },
    firms,
    NOW,
  );
}

describe('ITPerforma.create', () => {
  it('starts in DRAFT with invited firms', () => {
    const it = make();
    expect(it.status).toBe(ITStatus.DRAFT);
    expect(it.invitedFirms).toEqual([F1, F2]);
  });

  it('requires a well-formed IT reference', () => {
    expect(() =>
      ITPerforma.create(
        'IT-X',
        { indentId: 'IND-X', reference: 'bad', preparedByUserId: PREPARER },
        [F1],
        NOW,
      ),
    ).toThrowError(ValidationError);
  });

  it('requires at least one firm', () => {
    expect(() => make([])).toThrowError(ValidationError);
  });
});

describe('ITPerforma lifecycle', () => {
  it('happy path DRAFT → IN_APPROVAL → APPROVED → DISPATCHED → CLOSED', () => {
    const it = make();
    it.startApproval(PREPARER);
    expect(it.status).toBe(ITStatus.IN_APPROVAL);
    it.markChainApproved('U-DP');
    expect(it.status).toBe(ITStatus.APPROVED);
    const closing = new Date(NOW.getTime() + 14 * 86_400_000);
    it.dispatch(PREPARER, NOW, closing);
    expect(it.status).toBe(ITStatus.DISPATCHED);
    expect(it.dispatchedAt).toEqual(NOW);
    it.close(PREPARER);
    expect(it.status).toBe(ITStatus.CLOSED);
  });

  it('rejects dispatch with past closing date', () => {
    const it = make();
    it.startApproval(PREPARER);
    it.markChainApproved('U-DP');
    expect(() => it.dispatch(PREPARER, NOW, new Date(NOW.getTime() - 1))).toThrowError(ValidationError);
  });

  it('rejects firm add/remove outside DRAFT', () => {
    const it = make();
    it.startApproval(PREPARER);
    expect(() => it.addFirm(PREPARER, '01HFIRMCCCCCCCCCCCCCCCCCCC')).toThrowError(InvalidStateTransitionError);
    expect(() => it.removeFirm(PREPARER, F1)).toThrowError(InvalidStateTransitionError);
  });

  it('refuses removing the last firm', () => {
    const it = make([F1]);
    expect(() => it.removeFirm(PREPARER, F1)).toThrowError(BusinessRuleViolationError);
  });

  it('chain rejection returns to DRAFT for rework', () => {
    const it = make();
    it.startApproval(PREPARER);
    it.markChainRejected('U-DP', 'wrong vendor list');
    expect(it.status).toBe(ITStatus.DRAFT);
  });
});
