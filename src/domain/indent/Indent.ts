import { AggregateRoot } from '../shared/AggregateRoot';
import { Money } from '../shared/Money';
import {
  InvalidStateTransitionError,
  BusinessRuleViolationError,
  ValidationError,
} from '../errors/DomainError';
import { IndentItem } from './IndentItem';
import {
  IndentStatus,
  IndentType,
  IndentPriority,
  isTerminal,
} from './IndentStatus';
import {
  IndentSubmittedEvent,
  IndentStatusChangedEvent,
  IndentControlNumberAssignedEvent,
  IndentCancelledEvent,
} from './events/IndentEvents';

export interface IndentProps {
  readonly indentNumber: string;
  readonly subject: string;
  readonly justification?: string;
  readonly type: IndentType;
  readonly priority: IndentPriority;
  readonly estimatedValue: Money;
  readonly indenterId: string;
  readonly sectionId: string;
  readonly fiscalYearId: string;
  readonly budgetHeadId: string;
}

/**
 * Indent aggregate — root of the procurement case. Owns:
 *   - items (IndentItem child entities)
 *   - lifecycle status
 *   - assignment to a Concerned ADP section
 *   - the control number (assigned by ADP)
 *
 * Does NOT own:
 *   - approval chains → see ApprovalChain aggregate
 *   - firm offers, TSR, CST → separate aggregates linked by itPerformaId
 *
 * All transitions go through typed command methods on the aggregate and emit
 * domain events. The HTTP/application layers never set `status` directly.
 */
export class Indent extends AggregateRoot<string> {
  private _status: IndentStatus;
  private _controlNumber: string | null;
  private _assignedAdpId: string | null;
  private _submittedAt: Date | null;
  private _closedAt: Date | null;
  private _cancelledAt: Date | null;
  private _cancelledReason: string | null;
  private readonly _items: IndentItem[];

  // Immutable identity + ownership fields
  public readonly indentNumber: string;
  public readonly subject: string;
  public readonly justification: string | undefined;
  public readonly type: IndentType;
  public readonly priority: IndentPriority;
  public readonly estimatedValue: Money;
  public readonly indenterId: string;
  public readonly sectionId: string;
  public readonly fiscalYearId: string;
  public readonly budgetHeadId: string;
  public readonly createdAt: Date;

  private constructor(
    id: string,
    version: number,
    props: IndentProps & {
      status: IndentStatus;
      controlNumber: string | null;
      assignedAdpId: string | null;
      items: IndentItem[];
      submittedAt: Date | null;
      closedAt: Date | null;
      cancelledAt: Date | null;
      cancelledReason: string | null;
      createdAt: Date;
    },
  ) {
    super(id, version);
    this.indentNumber = props.indentNumber;
    this.subject = props.subject;
    this.justification = props.justification;
    this.type = props.type;
    this.priority = props.priority;
    this.estimatedValue = props.estimatedValue;
    this.indenterId = props.indenterId;
    this.sectionId = props.sectionId;
    this.fiscalYearId = props.fiscalYearId;
    this.budgetHeadId = props.budgetHeadId;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._controlNumber = props.controlNumber;
    this._assignedAdpId = props.assignedAdpId;
    this._items = props.items;
    this._submittedAt = props.submittedAt;
    this._closedAt = props.closedAt;
    this._cancelledAt = props.cancelledAt;
    this._cancelledReason = props.cancelledReason;
  }

  // ---------------------------------------------------------------------------
  // Factories
  // ---------------------------------------------------------------------------

  /** Create a new indent in DRAFT with at least one item. */
  public static create(id: string, props: IndentProps, items: IndentItem[], now: Date): Indent {
    if (items.length === 0) {
      throw new ValidationError('An indent must have at least one item');
    }
    if (props.subject.trim().length === 0) {
      throw new ValidationError('Indent subject is required', { subject: 'required' });
    }
    // Lines must sum to a value equal to (or within a small tolerance of) the
    // declared estimatedValue. We fail hard on mismatch — this is one of the
    // commonest sources of fraud/clerical error in procurement.
    const computed = items.reduce(
      (acc, item) => acc.add(item.estimatedLineTotal()),
      Money.zero(props.estimatedValue.currency),
    );
    if (!computed.equals(props.estimatedValue)) {
      throw new BusinessRuleViolationError(
        `Estimated value ${props.estimatedValue.amountMinor} does not match line total ${computed.amountMinor}`,
      );
    }
    return new Indent(id, 0, {
      ...props,
      status: IndentStatus.DRAFT,
      controlNumber: null,
      assignedAdpId: null,
      items,
      submittedAt: null,
      closedAt: null,
      cancelledAt: null,
      cancelledReason: null,
      createdAt: now,
    });
  }

  /** Rehydrate from persistence. Does not validate invariants; the DB is trusted. */
  public static rehydrate(
    id: string,
    version: number,
    props: IndentProps & {
      status: IndentStatus;
      controlNumber: string | null;
      assignedAdpId: string | null;
      items: IndentItem[];
      submittedAt: Date | null;
      closedAt: Date | null;
      cancelledAt: Date | null;
      cancelledReason: string | null;
      createdAt: Date;
    },
  ): Indent {
    return new Indent(id, version, props);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public get status(): IndentStatus { return this._status; }
  public get controlNumber(): string | null { return this._controlNumber; }
  public get assignedAdpId(): string | null { return this._assignedAdpId; }
  public get submittedAt(): Date | null { return this._submittedAt; }
  public get closedAt(): Date | null { return this._closedAt; }
  public get cancelledAt(): Date | null { return this._cancelledAt; }
  public get cancelledReason(): string | null { return this._cancelledReason; }
  public get items(): readonly IndentItem[] { return [...this._items]; }

  // ---------------------------------------------------------------------------
  // Commands — the only legal way to change state.
  // Each one:
  //   1. Guards the current status (throws InvalidStateTransitionError).
  //   2. Enforces any business rule beyond the state machine.
  //   3. Mutates state.
  //   4. Emits a domain event.
  // ---------------------------------------------------------------------------

  /** Indenter submits the draft. */
  public submit(actorUserId: string, now: Date): void {
    this.assertActor('indenter', actorUserId, this.indenterId);
    this.transition(IndentStatus.DRAFT, IndentStatus.SUBMITTED, 'submit', actorUserId);
    this._submittedAt = now;
    this.addEvent(new IndentSubmittedEvent(this.id, now, actorUserId));
  }

  /** CR Section records receipt of the indent. */
  public markCRReceived(actorUserId: string): void {
    this.transition(IndentStatus.SUBMITTED, IndentStatus.CR_RECEIVED, 'cr.receive', actorUserId);
  }

  /** CR forwards to Budget. */
  public forwardToBudget(actorUserId: string): void {
    this.transition(IndentStatus.CR_RECEIVED, IndentStatus.BUDGET_CHECK, 'cr.forwardToBudget', actorUserId);
  }

  /** Budget confirms availability. */
  public markBudgetVerified(actorUserId: string): void {
    this.transition(IndentStatus.BUDGET_CHECK, IndentStatus.COORD_VETTING, 'budget.verify', actorUserId);
  }

  public rejectForBudget(actorUserId: string, reason: string): void {
    this.transition(IndentStatus.BUDGET_CHECK, IndentStatus.BUDGET_REJECTED, 'budget.reject', actorUserId, reason);
    this._closedAt = new Date();
  }

  /** COORD vets and forwards to a specific Concerned ADP section. */
  public assignToADP(actorUserId: string, adpSectionId: string): void {
    this.transition(IndentStatus.COORD_VETTING, IndentStatus.ADP_VETTING, 'coord.assignADP', actorUserId);
    this._assignedAdpId = adpSectionId;
  }

  /** Concerned ADP assigns a control number and sends to SUPTD. */
  public assignControlNumber(actorUserId: string, controlNumber: string): void {
    if (this._status !== IndentStatus.ADP_VETTING && this._status !== IndentStatus.ADP_OBSERVED) {
      throw new InvalidStateTransitionError(this._status, 'assignControlNumber');
    }
    if (this._controlNumber !== null) {
      throw new BusinessRuleViolationError('Control number already assigned');
    }
    if (!/^[A-Z0-9-]{4,40}$/.test(controlNumber)) {
      throw new ValidationError('Invalid control number format');
    }
    this._controlNumber = controlNumber;
    this.transitionRaw(this._status, IndentStatus.SUPTD_VETTING, 'adp.assignControlNumber', actorUserId);
    this.addEvent(new IndentControlNumberAssignedEvent(this.id, controlNumber, actorUserId));
  }

  /** ADP raises observations instead of forwarding. */
  public raiseObservation(actorUserId: string): void {
    this.transition(IndentStatus.ADP_VETTING, IndentStatus.ADP_OBSERVED, 'adp.observe', actorUserId);
  }

  /** Indenter resolves ADP observations and returns the file. */
  public resolveObservations(actorUserId: string): void {
    this.assertActor('indenter', actorUserId, this.indenterId);
    this.transition(IndentStatus.ADP_OBSERVED, IndentStatus.ADP_VETTING, 'indenter.resolveObservations', actorUserId);
  }

  /** SUPTD approves vetting; indent enters approval chain. */
  public enterIndentApproval(actorUserId: string): void {
    this.transition(IndentStatus.SUPTD_VETTING, IndentStatus.INDENT_APPROVAL, 'suptd.approve', actorUserId);
  }

  /** Approval chain reports a final APPROVED. For propriety indents, routes to CPO. */
  public markIndentApproved(actorUserId: string): void {
    const next = this.type === IndentType.PROPRIETY
      ? IndentStatus.CPO_APPROVAL
      : IndentStatus.IT_PREPARATION;
    this.transition(IndentStatus.INDENT_APPROVAL, next, 'chain.approve', actorUserId);
  }

  public markIndentRejected(actorUserId: string, reason: string): void {
    this.transition(IndentStatus.INDENT_APPROVAL, IndentStatus.INDENT_REJECTED, 'chain.reject', actorUserId, reason);
    this._closedAt = new Date();
  }

  /** CPO approves the propriety indent. */
  public markCPOApproved(actorUserId: string): void {
    this.transition(IndentStatus.CPO_APPROVAL, IndentStatus.IT_PREPARATION, 'cpo.approve', actorUserId);
  }

  /** Concerned ADP finishes the IT Issue Proforma and sends it into Chain #2. */
  public enterITApproval(actorUserId: string): void {
    this.transition(IndentStatus.IT_PREPARATION, IndentStatus.IT_APPROVAL, 'adp.enterITApproval', actorUserId);
  }

  public markITApproved(actorUserId: string): void {
    this.transition(IndentStatus.IT_APPROVAL, IndentStatus.IT_DISPATCHED, 'chain.approveIT', actorUserId);
  }

  public markTechnicalOffersOpen(actorUserId: string): void {
    this.transition(IndentStatus.IT_DISPATCHED, IndentStatus.TECH_OFFERS_OPEN, 'section.openTechnical', actorUserId);
  }

  public markTSRInProgress(actorUserId: string): void {
    this.transition(IndentStatus.TECH_OFFERS_OPEN, IndentStatus.TSR_IN_PROGRESS, 'inspectorate.startTSR', actorUserId);
  }

  public markCommercialOpen(actorUserId: string): void {
    this.transition(IndentStatus.TSR_IN_PROGRESS, IndentStatus.COMMERCIAL_OPEN, 'section.openCommercial', actorUserId);
  }

  public markCSTPreparation(actorUserId: string): void {
    this.transition(IndentStatus.COMMERCIAL_OPEN, IndentStatus.CST_PREPARATION, 'section.prepareCST', actorUserId);
  }

  public enterCSTApproval(actorUserId: string): void {
    this.transition(IndentStatus.CST_PREPARATION, IndentStatus.CST_APPROVAL, 'section.enterCSTApproval', actorUserId);
  }

  public markPRIssued(actorUserId: string): void {
    this.transition(IndentStatus.CST_APPROVAL, IndentStatus.PR_ISSUED, 'section.issuePR', actorUserId);
  }

  public close(actorUserId: string): void {
    this.transition(IndentStatus.PR_ISSUED, IndentStatus.CLOSED, 'section.close', actorUserId);
    this._closedAt = new Date();
  }

  /** Cancellation can be invoked from any non-terminal state by an authorised role. */
  public cancel(actorUserId: string, reason: string, now: Date): void {
    if (isTerminal(this._status)) {
      throw new InvalidStateTransitionError(this._status, 'cancel');
    }
    if (reason.trim().length === 0) {
      throw new ValidationError('Cancellation reason is required');
    }
    const prev = this._status;
    this._status = IndentStatus.CANCELLED;
    this._cancelledAt = now;
    this._cancelledReason = reason;
    this.addEvent(new IndentStatusChangedEvent(this.id, prev, this._status, actorUserId, reason));
    this.addEvent(new IndentCancelledEvent(this.id, reason, actorUserId));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private transition(
    from: IndentStatus,
    to: IndentStatus,
    event: string,
    actorUserId: string,
    reason?: string,
  ): void {
    if (this._status !== from) {
      throw new InvalidStateTransitionError(this._status, event);
    }
    this.transitionRaw(from, to, event, actorUserId, reason);
  }

  private transitionRaw(
    from: IndentStatus,
    to: IndentStatus,
    event: string,
    actorUserId: string,
    reason?: string,
  ): void {
    this._status = to;
    this.addEvent(new IndentStatusChangedEvent(this.id, from, to, actorUserId, reason));
  }

  private assertActor(role: string, actorId: string, expectedId: string): void {
    if (actorId !== expectedId) {
      throw new BusinessRuleViolationError(
        `Only the ${role} may perform this action (expected ${expectedId})`,
      );
    }
  }
}
