import { describe, it, expect } from 'vitest';
import { TSR } from '@/domain/tsr/TSR';
import { TSRStatus, TSRVerdict } from '@/domain/tsr/TSRTypes';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  NotFoundError,
} from '@/domain/errors/DomainError';

const NOW = new Date('2026-08-01T09:00:00Z');
const INSPECTOR = 'U-INSP';
const FIRM = '01HFIRMAAAAAAAAAAAAAAAAAAA';
const OFFER = '01HOFFER0000000000000000000';

function fresh(): TSR {
  return TSR.create('TSR-1', { itPerformaId: 'IT-1', inspectorateUserId: INSPECTOR }, NOW);
}

describe('TSR', () => {
  it('records an evaluation', () => {
    const t = fresh();
    t.recordEvaluation('EV-1', INSPECTOR, OFFER, TSRVerdict.ACCEPTED, 'ok', NOW);
    expect(t.evaluations).toHaveLength(1);
    expect(t.isAccepted(OFFER)).toBe(true);
  });

  it('refuses rejection without remarks', () => {
    const t = fresh();
    expect(() =>
      t.recordEvaluation('EV-1', INSPECTOR, OFFER, TSRVerdict.REJECTED, null, NOW),
    ).toThrowError(BusinessRuleViolationError);
  });

  it('raises a query → status QUERIES_RAISED', () => {
    const t = fresh();
    t.raiseQuery('Q-1', INSPECTOR, FIRM, 'please clarify spec X', NOW);
    expect(t.status).toBe(TSRStatus.QUERIES_RAISED);
    expect(t.queries).toHaveLength(1);
  });

  it('firm can answer open queries', () => {
    const t = fresh();
    t.raiseQuery('Q-1', INSPECTOR, FIRM, 'clarify', NOW);
    t.answerQuery('Q-1', 'U-FIRM', FIRM, 'clarified', NOW);
    expect(t.queries[0]!.response).toBe('clarified');
  });

  it('answerQuery fails if firm mismatches', () => {
    const t = fresh();
    t.raiseQuery('Q-1', INSPECTOR, FIRM, 'clarify', NOW);
    expect(() => t.answerQuery('Q-1', 'U-FIRM', 'OTHER-FIRM-01HFIRMBBBBBBBBB', 'nope', NOW))
      .toThrowError(BusinessRuleViolationError);
  });

  it('answerQuery unknown query throws NotFound', () => {
    const t = fresh();
    expect(() => t.answerQuery('MISSING', 'U-FIRM', FIRM, 'x', NOW)).toThrowError(NotFoundError);
  });

  it('submit requires at least one evaluation and no open queries', () => {
    const t = fresh();
    expect(() => t.submit(INSPECTOR, 'summary', NOW)).toThrowError(BusinessRuleViolationError);
    t.recordEvaluation('EV-1', INSPECTOR, OFFER, TSRVerdict.ACCEPTED, null, NOW);
    t.raiseQuery('Q-1', INSPECTOR, FIRM, 'q', NOW);
    expect(() => t.submit(INSPECTOR, 'summary', NOW)).toThrowError(BusinessRuleViolationError);
    t.answerQuery('Q-1', 'U-FIRM', FIRM, 'a', NOW);
    t.submit(INSPECTOR, 'summary', NOW);
    expect(t.status).toBe(TSRStatus.SUBMITTED);
  });

  it('complete moves SUBMITTED → COMPLETED', () => {
    const t = fresh();
    t.recordEvaluation('EV-1', INSPECTOR, OFFER, TSRVerdict.ACCEPTED, null, NOW);
    t.submit(INSPECTOR, 'summary', NOW);
    t.complete(INSPECTOR, NOW);
    expect(t.status).toBe(TSRStatus.COMPLETED);
    expect(() => t.complete(INSPECTOR, NOW)).toThrowError(InvalidStateTransitionError);
  });
});
