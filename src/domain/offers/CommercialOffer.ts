import { AggregateRoot } from '../shared/AggregateRoot';
import { Money } from '../shared/Money';
import {
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { OfferStatus } from './OfferStatus';
import {
  CommercialOfferOpenedEvent,
  CommercialOfferStatusChangedEvent,
} from './events/OfferEvents';

export interface CommercialOfferProps {
  readonly itPerformaId: string;
  readonly firmId: string;
  readonly totalPrice: Money;
  readonly deliveryWeeks?: number;
  readonly documentKey?: string;
}

/**
 * CommercialOffer — the sealed envelope opened by the Concerned Section for
 * each technically-accepted firm. Prices are stored as Money (10^-4 scale).
 */
export class CommercialOffer extends AggregateRoot<string> {
  public readonly itPerformaId: string;
  public readonly firmId: string;
  public readonly openedAt: Date;
  public readonly totalPrice: Money;
  public readonly deliveryWeeks: number | null;
  public readonly documentKey: string | null;

  private _status: OfferStatus;

  private constructor(
    id: string,
    version: number,
    props: CommercialOfferProps & { status: OfferStatus; openedAt: Date },
  ) {
    super(id, version);
    this.itPerformaId = props.itPerformaId;
    this.firmId = props.firmId;
    this.openedAt = props.openedAt;
    this.totalPrice = props.totalPrice;
    this.deliveryWeeks = props.deliveryWeeks ?? null;
    this.documentKey = props.documentKey ?? null;
    this._status = props.status;
  }

  public static open(id: string, props: CommercialOfferProps, now: Date): CommercialOffer {
    if (props.deliveryWeeks !== undefined && props.deliveryWeeks < 0) {
      throw new ValidationError('deliveryWeeks must be ≥ 0');
    }
    const offer = new CommercialOffer(id, 0, {
      ...props,
      status: OfferStatus.RECEIVED,
      openedAt: now,
    });
    offer.addEvent(
      new CommercialOfferOpenedEvent(
        id,
        props.itPerformaId,
        props.firmId,
        props.totalPrice.amountMinor.toString(),
        props.totalPrice.currency,
      ),
    );
    return offer;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: CommercialOfferProps & { status: OfferStatus; openedAt: Date },
  ): CommercialOffer {
    return new CommercialOffer(id, version, props);
  }

  public get status(): OfferStatus { return this._status; }

  public markUnderReview(actorUserId: string): void {
    this.transition(OfferStatus.RECEIVED, OfferStatus.UNDER_REVIEW, actorUserId);
  }

  public markAccepted(actorUserId: string): void {
    if (this._status !== OfferStatus.RECEIVED && this._status !== OfferStatus.UNDER_REVIEW) {
      throw new InvalidStateTransitionError(this._status, 'accept');
    }
    const prev = this._status;
    this._status = OfferStatus.ACCEPTED;
    this.addEvent(new CommercialOfferStatusChangedEvent(this.id, prev, this._status, actorUserId));
  }

  public markRejected(actorUserId: string): void {
    if (this._status !== OfferStatus.RECEIVED && this._status !== OfferStatus.UNDER_REVIEW) {
      throw new InvalidStateTransitionError(this._status, 'reject');
    }
    const prev = this._status;
    this._status = OfferStatus.REJECTED;
    this.addEvent(new CommercialOfferStatusChangedEvent(this.id, prev, this._status, actorUserId));
  }

  private transition(from: OfferStatus, to: OfferStatus, actorUserId: string): void {
    if (this._status !== from) throw new InvalidStateTransitionError(this._status, `${from}->${to}`);
    this._status = to;
    this.addEvent(new CommercialOfferStatusChangedEvent(this.id, from, to, actorUserId));
  }
}
