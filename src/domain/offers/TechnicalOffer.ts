import { AggregateRoot } from '../shared/AggregateRoot';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { OfferStatus } from './OfferStatus';
import {
  TechnicalOfferSubmittedEvent,
  TechnicalOfferStatusChangedEvent,
} from './events/OfferEvents';

export interface TechnicalOfferProps {
  readonly itPerformaId: string;
  readonly firmId: string;
  readonly documentKey?: string;
  readonly remarks?: string;
}

/**
 * TechnicalOffer — one submission per (IT, firm). The TSR module later marks
 * each offer ACCEPTED or REJECTED based on evaluation.
 */
export class TechnicalOffer extends AggregateRoot<string> {
  public readonly itPerformaId: string;
  public readonly firmId: string;
  public readonly submittedAt: Date;
  public readonly documentKey: string | null;

  private _status: OfferStatus;
  private _remarks: string | null;

  private constructor(
    id: string,
    version: number,
    props: Omit<TechnicalOfferProps, 'remarks'> & {
      status: OfferStatus;
      submittedAt: Date;
      remarks: string | null;
    },
  ) {
    super(id, version);
    this.itPerformaId = props.itPerformaId;
    this.firmId = props.firmId;
    this.submittedAt = props.submittedAt;
    this.documentKey = props.documentKey ?? null;
    this._status = props.status;
    this._remarks = props.remarks;
  }

  public static create(id: string, props: TechnicalOfferProps, now: Date): TechnicalOffer {
    if (props.firmId.length !== 26) throw new ValidationError('Invalid firmId');
    const offer = new TechnicalOffer(id, 0, {
      itPerformaId: props.itPerformaId,
      firmId: props.firmId,
      documentKey: props.documentKey,
      status: OfferStatus.RECEIVED,
      submittedAt: now,
      remarks: props.remarks ?? null,
    });
    offer.addEvent(new TechnicalOfferSubmittedEvent(id, props.itPerformaId, props.firmId, now));
    return offer;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: Omit<TechnicalOfferProps, 'remarks'> & {
      status: OfferStatus;
      submittedAt: Date;
      remarks: string | null;
    },
  ): TechnicalOffer {
    return new TechnicalOffer(id, version, props);
  }

  public get status(): OfferStatus { return this._status; }
  public get remarks(): string | null { return this._remarks; }

  public markUnderReview(actorUserId: string): void {
    this.transition(OfferStatus.RECEIVED, OfferStatus.UNDER_REVIEW, actorUserId, null);
  }

  public markAccepted(actorUserId: string, remarks: string | null): void {
    if (this._status !== OfferStatus.UNDER_REVIEW && this._status !== OfferStatus.RECEIVED) {
      throw new InvalidStateTransitionError(this._status, 'accept');
    }
    this.transitionRaw(this._status, OfferStatus.ACCEPTED, actorUserId, remarks);
  }

  public markRejected(actorUserId: string, remarks: string): void {
    if (!remarks || remarks.trim().length === 0) {
      throw new BusinessRuleViolationError('Rejection remarks are required');
    }
    if (this._status !== OfferStatus.UNDER_REVIEW && this._status !== OfferStatus.RECEIVED) {
      throw new InvalidStateTransitionError(this._status, 'reject');
    }
    this.transitionRaw(this._status, OfferStatus.REJECTED, actorUserId, remarks);
  }

  public withdraw(actorUserId: string, reason: string): void {
    if (this._status === OfferStatus.WITHDRAWN) {
      throw new InvalidStateTransitionError(this._status, 'withdraw');
    }
    this.transitionRaw(this._status, OfferStatus.WITHDRAWN, actorUserId, reason);
  }

  private transition(from: OfferStatus, to: OfferStatus, actorUserId: string, remarks: string | null): void {
    if (this._status !== from) throw new InvalidStateTransitionError(this._status, `${from}->${to}`);
    this.transitionRaw(from, to, actorUserId, remarks);
  }

  private transitionRaw(from: OfferStatus, to: OfferStatus, actorUserId: string, remarks: string | null): void {
    this._status = to;
    this._remarks = remarks;
    this.addEvent(new TechnicalOfferStatusChangedEvent(this.id, from, to, actorUserId, remarks));
  }
}
