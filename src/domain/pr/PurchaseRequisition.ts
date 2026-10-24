import { AggregateRoot } from '../shared/AggregateRoot';
import { Money } from '../shared/Money';
import {
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { PRStatus } from './PRStatus';
import {
  PurchaseRequisitionCreatedEvent,
  PurchaseRequisitionStatusChangedEvent,
} from './events/PREvents';

export interface PurchaseRequisitionProps {
  readonly cstId: string;
  readonly firmId: string;
  readonly prNumber: string;
  readonly amount: Money;
}

export class PurchaseRequisition extends AggregateRoot<string> {
  public readonly cstId: string;
  public readonly firmId: string;
  public readonly prNumber: string;
  public readonly amount: Money;
  public readonly createdAt: Date;

  private _status: PRStatus;
  private _faxedAt: Date | null;

  private constructor(
    id: string,
    version: number,
    props: PurchaseRequisitionProps & { status: PRStatus; faxedAt: Date | null; createdAt: Date },
  ) {
    super(id, version);
    this.cstId = props.cstId;
    this.firmId = props.firmId;
    this.prNumber = props.prNumber;
    this.amount = props.amount;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._faxedAt = props.faxedAt;
  }

  public static create(id: string, props: PurchaseRequisitionProps, now: Date): PurchaseRequisition {
    if (!/^PR\/[A-Z0-9\/-]{3,55}$/.test(props.prNumber)) {
      throw new ValidationError('Invalid PR number format (expected PR/…)', { prNumber: 'format' });
    }
    const pr = new PurchaseRequisition(id, 0, {
      ...props,
      status: PRStatus.DRAFT,
      faxedAt: null,
      createdAt: now,
    });
    pr.addEvent(
      new PurchaseRequisitionCreatedEvent(
        id,
        props.cstId,
        props.firmId,
        props.prNumber,
        props.amount.amountMinor.toString(),
        props.amount.currency,
      ),
    );
    return pr;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: PurchaseRequisitionProps & { status: PRStatus; faxedAt: Date | null; createdAt: Date },
  ): PurchaseRequisition {
    return new PurchaseRequisition(id, version, props);
  }

  public get status(): PRStatus { return this._status; }
  public get faxedAt(): Date | null { return this._faxedAt; }

  public send(actorUserId: string, now: Date): void {
    this.transition(PRStatus.DRAFT, PRStatus.SENT, actorUserId);
    this._faxedAt = now;
  }

  public acknowledge(actorUserId: string): void {
    this.transition(PRStatus.SENT, PRStatus.ACKNOWLEDGED, actorUserId);
  }

  public close(actorUserId: string): void {
    if (this._status !== PRStatus.ACKNOWLEDGED && this._status !== PRStatus.SENT) {
      throw new InvalidStateTransitionError(this._status, 'close');
    }
    const prev = this._status;
    this._status = PRStatus.CLOSED;
    this.addEvent(new PurchaseRequisitionStatusChangedEvent(this.id, prev, this._status, actorUserId));
  }

  private transition(from: PRStatus, to: PRStatus, actorUserId: string): void {
    if (this._status !== from) throw new InvalidStateTransitionError(this._status, `${from}->${to}`);
    this._status = to;
    this.addEvent(new PurchaseRequisitionStatusChangedEvent(this.id, from, to, actorUserId));
  }
}
