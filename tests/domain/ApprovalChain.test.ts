import { describe, it, expect } from 'vitest';
import { ApprovalChain } from '@/domain/approval/ApprovalChain';
import {
  ApprovalChainStatus,
  ApprovalRole,
  ApprovalStepStatus,
  ApprovalSubject,
  CHAIN_TEMPLATES,
} from '@/domain/approval/ApprovalTypes';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '@/domain/errors/DomainError';

const NOW = new Date('2026-06-01T09:00:00Z');
let counter = 0;
const idFactory = () => `ST-${++counter}`;

describe('ApprovalChain.start', () => {
  it('creates a step per template role in order', () => {
    const c = ApprovalChain.start(
      'CH-1',
      ApprovalSubject.INDENT,
      'IND-1',
      CHAIN_TEMPLATES.INDENT,
      idFactory,
      NOW,
    );
    expect(c.status).toBe(ApprovalChainStatus.PENDING);
    expect(c.steps).toHaveLength(5);
    expect(c.steps.map((s) => s.role)).toEqual([
      ApprovalRole.AD,
      ApprovalRole.DD,
      ApprovalRole.DP_N,
      ApprovalRole.DGDP,
      ApprovalRole.SECY_DP,
    ]);
    expect(c.currentStep()?.role).toBe(ApprovalRole.AD);
  });

  it('refuses an empty template', () => {
    expect(() =>
      ApprovalChain.start('CH-X', ApprovalSubject.INDENT, 'IND-X', [], idFactory, NOW),
    ).toThrowError(ValidationError);
  });
});

describe('ApprovalChain.decide', () => {
  const build = () =>
    ApprovalChain.start(
      'CH-A',
      ApprovalSubject.INDENT,
      'IND-A',
      CHAIN_TEMPLATES.INDENT,
      idFactory,
      NOW,
    );

  it('advances to the next step on APPROVED', () => {
    const c = build();
    c.decide('U-AD', ApprovalStepStatus.APPROVED, 'LGTM', NOW);
    expect(c.currentStep()?.role).toBe(ApprovalRole.DD);
    expect(c.steps[0]!.status).toBe(ApprovalStepStatus.APPROVED);
    expect(c.steps[0]!.decidedByUserId).toBe('U-AD');
  });

  it('completes with APPROVED on the final step', () => {
    const c = build();
    c.decide('U-AD',     ApprovalStepStatus.APPROVED, null, NOW);
    c.decide('U-DD',     ApprovalStepStatus.APPROVED, null, NOW);
    c.decide('U-DP',     ApprovalStepStatus.APPROVED, null, NOW);
    c.decide('U-DGDP',   ApprovalStepStatus.APPROVED, null, NOW);
    c.decide('U-SECYDP', ApprovalStepStatus.APPROVED, null, NOW);
    expect(c.status).toBe(ApprovalChainStatus.APPROVED);
    expect(c.isComplete()).toBe(true);
    expect(c.currentStep()).toBeNull();
  });

  it('terminates on REJECTED at any step', () => {
    const c = build();
    c.decide('U-AD', ApprovalStepStatus.APPROVED, null, NOW);
    c.decide('U-DD', ApprovalStepStatus.REJECTED, 'budget head wrong', NOW);
    expect(c.status).toBe(ApprovalChainStatus.REJECTED);
    expect(c.steps[1]!.comments).toBe('budget head wrong');
  });

  it('refuses to decide once terminal', () => {
    const c = build();
    c.decide('U-AD', ApprovalStepStatus.REJECTED, null, NOW);
    expect(() => c.decide('U-AD', ApprovalStepStatus.APPROVED, null, NOW)).toThrowError(
      InvalidStateTransitionError,
    );
  });

  it('withdraw moves a pending chain to WITHDRAWN', () => {
    const c = build();
    c.withdraw(NOW);
    expect(c.status).toBe(ApprovalChainStatus.WITHDRAWN);
    expect(() => c.withdraw(NOW)).toThrowError(InvalidStateTransitionError);
  });

  it('emits step-decided + chain-completed events', () => {
    const c = build();
    c.decide('U-AD', ApprovalStepStatus.REJECTED, null, NOW);
    const names = c.pullEvents().map((e) => e.eventName);
    expect(names).toContain('approval.step.decided');
    expect(names).toContain('approval.chain.completed');
  });
});
