import { AggregateRoot } from '../shared/AggregateRoot';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { ITStatus, TERMINAL_IT_STATUSES } from './ITStatus';
import {
  ITProformaCreatedEvent,
  ITStatusChangedEvent,
  ITFirmInvitedEvent,
  ITFirmUninvitedEvent,
  ITDispatchedEvent,
} from './events/ITEvents';

export interface ITPerformaProps {
  readonly indentId: string;
  readonly reference: string;
  readonly checklist?: Readonly<Record<string, unknown>>;
  readonly preparedByUserId: string;
}

/**
 * IT (Invitation to Tender) Issue Proforma aggregate. Owns:
 *   - the IT reference number
 *   - the checklist filled by the Concerned ADP
 *   - the set of firms invited to tender
 *   - its own lifecycle: DRAFT → IN_APPROVAL → APPROVED → DISPATCHED → CLOSED
 *
 * The firm-invites set is managed through add/remove commands and is frozen
 * once the proforma leaves DRAFT.
 */
export class ITPerforma extends AggregateRoot<string> {
  public readonly indentId: string;
  public readonly reference: string;
  public readonly checklist: Readonly<Record<string, unknown>> | undefined;
  public readonly preparedByUserId: string;
  public readonly createdAt: Date;

  private _status: ITStatus;
  private _dispatchedAt: Date | null;
  private _closingAt: Date | null;
  private readonly _invitedFirms: Set<string>;

  private constructor(
    id: string,
    version: number,
    props: ITPerformaProps & {
      status: ITStatus;
      dispatchedAt: Date | null;
      closingAt: Date | null;
      invitedFirms: Iterable<string>;
      createdAt: Date;
    },
  ) {
    super(id, version);
    this.indentId = props.indentId;
    this.reference = props.reference;
    this.checklist = props.checklist;
    this.preparedByUserId = props.preparedByUserId;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._dispatchedAt = props.dispatchedAt;
    this._closingAt = props.closingAt;
    this._invitedFirms = new Set(props.invitedFirms);
  }

  public static create(
    id: string,
    props: ITPerformaProps,
    invitedFirms: Iterable<string>,
    now: Date,
  ): ITPerforma {
    if (!/^IT\/[A-Z0-9\/-]{3,55}$/.test(props.reference)) {
      throw new ValidationError('Invalid IT reference format (expected IT/…)', {
        reference: 'format',
      });
    }
    const firms = new Set(invitedFirms);
    if (firms.size < 1) {
      throw new ValidationError('At least one firm must be invited', { firms: 'required' });
    }
    const it = new ITPerforma(id, 0, {
      ...props,
      status: ITStatus.DRAFT,
      dispatchedAt: null,
      closingAt: null,
      invitedFirms: firms,
      createdAt: now,
    });
    it.addEvent(new ITProformaCreatedEvent(id, props.indentId, props.reference, props.preparedByUserId));
    for (const firmId of firms) {
      it.addEvent(new ITFirmInvitedEvent(id, firmId, props.preparedByUserId));
    }
    return it;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: ITPerformaProps & {
      status: ITStatus;
      dispatchedAt: Date | null;
      closingAt: Date | null;
      invitedFirms: Iterable<string>;
      createdAt: Date;
    },
  ): ITPerforma {
    return new ITPerforma(id, version, props);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public get status(): ITStatus { return this._status; }
  public get dispatchedAt(): Date | null { return this._dispatchedAt; }
  public get closingAt(): Date | null { return this._closingAt; }
  public get invitedFirms(): readonly string[] { return [...this._invitedFirms]; }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  public addFirm(actorUserId: string, firmId: string): void {
    this.assertDraft('addFirm');
    if (this._invitedFirms.has(firmId)) {
      throw new BusinessRuleViolationError(`Firm ${firmId} already invited`);
    }
    this._invitedFirms.add(firmId);
    this.addEvent(new ITFirmInvitedEvent(this.id, firmId, actorUserId));
  }

  public removeFirm(actorUserId: string, firmId: string): void {
    this.assertDraft('removeFirm');
    if (!this._invitedFirms.has(firmId)) {
      throw new BusinessRuleViolationError(`Firm ${firmId} is not invited`);
    }
    if (this._invitedFirms.size === 1) {
      throw new BusinessRuleViolationError('At least one firm must remain invited');
    }
    this._invitedFirms.delete(firmId);
    this.addEvent(new ITFirmUninvitedEvent(this.id, firmId, actorUserId));
  }

  public startApproval(actorUserId: string): void {
    this.transition(ITStatus.DRAFT, ITStatus.IN_APPROVAL, 'startApproval', actorUserId);
  }

  /** Called by the ApprovalChain cascade when Chain #2 terminates APPROVED. */
  public markChainApproved(actorUserId: string): void {
    this.transition(ITStatus.IN_APPROVAL, ITStatus.APPROVED, 'chain.approve', actorUserId);
  }

  /** Called by the cascade when Chain #2 rejects — IT falls back to DRAFT for rework. */
  public markChainRejected(actorUserId: string, reason: string): void {
    this.transition(ITStatus.IN_APPROVAL, ITStatus.DRAFT, 'chain.reject', actorUserId, reason);
  }

  public dispatch(actorUserId: string, now: Date, closingAt: Date): void {
    if (closingAt.getTime() <= now.getTime()) {
      throw new ValidationError('Closing date must be in the future', { closingAt: 'past' });
    }
    this.transition(ITStatus.APPROVED, ITStatus.DISPATCHED, 'dispatch', actorUserId);
    this._dispatchedAt = now;
    this._closingAt = closingAt;
    this.addEvent(new ITDispatchedEvent(this.id, actorUserId, now, closingAt));
  }

  public close(actorUserId: string): void {
    this.transition(ITStatus.DISPATCHED, ITStatus.CLOSED, 'close', actorUserId);
  }

  public cancel(actorUserId: string, reason: string): void {
    if (TERMINAL_IT_STATUSES.has(this._status)) {
      throw new InvalidStateTransitionError(this._status, 'cancel');
    }
    if (reason.trim().length === 0) throw new ValidationError('Cancellation reason is required');
    const prev = this._status;
    this._status = ITStatus.CANCELLED;
    this.addEvent(new ITStatusChangedEvent(this.id, prev, this._status, actorUserId, reason));
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private transition(
    from: ITStatus,
    to: ITStatus,
    event: string,
    actorUserId: string,
    reason?: string,
  ): void {
    if (this._status !== from) {
      throw new InvalidStateTransitionError(this._status, event);
    }
    this._status = to;
    this.addEvent(new ITStatusChangedEvent(this.id, from, to, actorUserId, reason));
  }

  private assertDraft(op: string): void {
    if (this._status !== ITStatus.DRAFT) {
      throw new InvalidStateTransitionError(this._status, op);
    }
  }
}
