import { describe, it, expect } from 'vitest';
import { Indent } from '@/domain/indent/Indent';
import { IndentItem } from '@/domain/indent/IndentItem';
import { IndentStatus, IndentType, IndentPriority } from '@/domain/indent/IndentStatus';
import { Money } from '@/domain/shared/Money';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '@/domain/errors/DomainError';

const INDENTER = 'U-INDENTER';
const CR = 'U-CR';
const BUDGET = 'U-BUDGET';
const COORD = 'U-COORD';
const ADP = 'U-ADP';
const SUPTD = 'U-SUPTD';
const ADP_SECTION = 'S-ADP-1';
const SECTION = 'S-INDENTER-1';
const FY = 'FY-2026-27';
const BH = 'BH-NAVY-CAP';
const NOW = new Date('2026-05-01T10:00:00Z');

function freshIndent(overrides?: { estimatedValue?: Money }): Indent {
  // Money.amountMinor is in 10^-4 of PKR → 100.00 PKR == 1_000_000n.
  const unit = Money.of(1_000_000n, 'PKR');
  const item = IndentItem.create('IT-1', {
    indentId: 'IND-1',
    lineNo: 1,
    description: 'Widget',
    quantity: 10,
    uom: 'EA',
    estimatedUnitPrice: unit,
  });
  // 10 units × 100.00 PKR = 1_000.00 PKR == 10_000_000n in 10^-4 minor units.
  const total = overrides?.estimatedValue ?? Money.of(unit.amountMinor * 10n, 'PKR');
  return Indent.create(
    'IND-1',
    {
      indentNumber: 'IND/2026/00001',
      subject: 'Spares for FFG',
      type: IndentType.NORMAL,
      priority: IndentPriority.NORMAL,
      estimatedValue: total,
      indenterId: INDENTER,
      sectionId: SECTION,
      fiscalYearId: FY,
      budgetHeadId: BH,
    },
    [item],
    NOW,
  );
}

describe('Indent.create', () => {
  it('starts in DRAFT with version 0 and no events (initial)', () => {
    const i = freshIndent();
    expect(i.status).toBe(IndentStatus.DRAFT);
    expect(i.version).toBe(0);
    expect(i.pullEvents()).toHaveLength(0); // creation does not emit events in this model
  });

  it('refuses creation with no items', () => {
    expect(() =>
      Indent.create(
        'IND-X',
        {
          indentNumber: 'IND/2026/00002',
          subject: 'Empty',
          type: IndentType.NORMAL,
          priority: IndentPriority.NORMAL,
          estimatedValue: Money.of(100n, 'PKR'),
          indenterId: INDENTER,
          sectionId: SECTION,
          fiscalYearId: FY,
          budgetHeadId: BH,
        },
        [],
        NOW,
      ),
    ).toThrowError(ValidationError);
  });

  it('refuses creation when line total ≠ declared value', () => {
    expect(() => freshIndent({ estimatedValue: Money.of(1n, 'PKR') })).toThrowError(
      BusinessRuleViolationError,
    );
  });
});

describe('Indent lifecycle', () => {
  it('runs the happy path indenter → CR → budget → COORD → ADP → SUPTD', () => {
    const i = freshIndent();
    i.submit(INDENTER, NOW);
    i.markCRReceived(CR);
    i.forwardToBudget(CR);
    i.markBudgetVerified(BUDGET);
    i.assignToADP(COORD, ADP_SECTION);
    expect(i.assignedAdpId).toBe(ADP_SECTION);
    i.assignControlNumber(ADP, 'CTRL-00123');
    expect(i.controlNumber).toBe('CTRL-00123');
    expect(i.status).toBe(IndentStatus.SUPTD_VETTING);

    i.enterIndentApproval(SUPTD);
    i.markIndentApproved(ADP);
    expect(i.status).toBe(IndentStatus.IT_PREPARATION);

    i.enterITApproval(ADP);
    i.markITApproved(ADP);
    expect(i.status).toBe(IndentStatus.IT_DISPATCHED);
  });

  it('refuses out-of-order transitions', () => {
    const i = freshIndent();
    expect(() => i.markCRReceived(CR)).toThrowError(InvalidStateTransitionError);
  });

  it('rejects at Budget routes to BUDGET_REJECTED', () => {
    const i = freshIndent();
    i.submit(INDENTER, NOW);
    i.markCRReceived(CR);
    i.forwardToBudget(CR);
    i.rejectForBudget(BUDGET, 'Insufficient allocation');
    expect(i.status).toBe(IndentStatus.BUDGET_REJECTED);
    expect(() => i.markBudgetVerified(BUDGET)).toThrowError(InvalidStateTransitionError);
  });

  it('propriety indents route via CPO after chain approval', () => {
    const unit = Money.of(5_000_000n, 'PKR'); // 500.00 PKR in 10^-4 minor units
    const item = IndentItem.create('IT-P', {
      indentId: 'IND-P',
      lineNo: 1,
      description: 'OEM part',
      quantity: 1,
      uom: 'EA',
      estimatedUnitPrice: unit,
    });
    const i = Indent.create(
      'IND-P',
      {
        indentNumber: 'IND/2026/P1',
        subject: 'OEM-only',
        type: IndentType.PROPRIETY,
        priority: IndentPriority.HIGH,
        estimatedValue: unit,
        indenterId: INDENTER,
        sectionId: SECTION,
        fiscalYearId: FY,
        budgetHeadId: BH,
      },
      [item],
      NOW,
    );
    i.submit(INDENTER, NOW);
    i.markCRReceived(CR);
    i.forwardToBudget(CR);
    i.markBudgetVerified(BUDGET);
    i.assignToADP(COORD, ADP_SECTION);
    i.assignControlNumber(ADP, 'CTRL-P');
    i.enterIndentApproval(SUPTD);
    i.markIndentApproved(ADP);
    expect(i.status).toBe(IndentStatus.CPO_APPROVAL);
    i.markCPOApproved('U-CPO');
    expect(i.status).toBe(IndentStatus.IT_PREPARATION);
  });

  it('cancel is legal from any non-terminal state and requires a reason', () => {
    const i = freshIndent();
    i.submit(INDENTER, NOW);
    expect(() => i.cancel(INDENTER, '', NOW)).toThrowError(ValidationError);
    i.cancel(INDENTER, 'Duplicate', NOW);
    expect(i.status).toBe(IndentStatus.CANCELLED);
    expect(() => i.cancel(INDENTER, 'again', NOW)).toThrowError(InvalidStateTransitionError);
  });

  it('submit requires the owning indenter', () => {
    const i = freshIndent();
    expect(() => i.submit('someone-else', NOW)).toThrowError(BusinessRuleViolationError);
  });

  it('control-number assignment is one-shot and format-validated', () => {
    const i = freshIndent();
    i.submit(INDENTER, NOW);
    i.markCRReceived(CR);
    i.forwardToBudget(CR);
    i.markBudgetVerified(BUDGET);
    i.assignToADP(COORD, ADP_SECTION);
    expect(() => i.assignControlNumber(ADP, 'bad lowercase')).toThrowError(ValidationError);
    i.assignControlNumber(ADP, 'CTRL-1');
    // The state machine moved the indent to SUPTD_VETTING, so re-calling
    // assignControlNumber trips the state guard first — which is the correct
    // outer protection against duplicate assignment.
    expect(() => i.assignControlNumber(ADP, 'CTRL-2')).toThrowError(InvalidStateTransitionError);
  });

  it('emits a status-changed event for every transition', () => {
    const i = freshIndent();
    i.submit(INDENTER, NOW);
    const events = i.pullEvents();
    expect(events.map((e) => e.eventName)).toContain('indent.status.changed');
    expect(events.map((e) => e.eventName)).toContain('indent.submitted');
    // pullEvents drains the buffer
    expect(i.pullEvents()).toHaveLength(0);
  });
});
