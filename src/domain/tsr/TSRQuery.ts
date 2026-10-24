import { Entity } from '../shared/Entity';
import { TSRQueryStatus } from './TSRTypes';
import { BusinessRuleViolationError, InvalidStateTransitionError } from '../errors/DomainError';

export interface TSRQueryProps {
  readonly tsrId: string;
  readonly firmId: string;
  readonly question: string;
  readonly response: string | null;
  readonly status: TSRQueryStatus;
  readonly askedAt: Date;
  readonly answeredAt: Date | null;
}

export class TSRQuery extends Entity<string> {
  public readonly tsrId: string;
  public readonly firmId: string;
  public readonly question: string;
  public readonly askedAt: Date;
  private _response: string | null;
  private _status: TSRQueryStatus;
  private _answeredAt: Date | null;

  private constructor(id: string, props: TSRQueryProps) {
    super(id);
    this.tsrId = props.tsrId;
    this.firmId = props.firmId;
    this.question = props.question;
    this.askedAt = props.askedAt;
    this._response = props.response;
    this._status = props.status;
    this._answeredAt = props.answeredAt;
  }

  public static create(id: string, props: TSRQueryProps): TSRQuery {
    return new TSRQuery(id, props);
  }

  public get status(): TSRQueryStatus { return this._status; }
  public get response(): string | null { return this._response; }
  public get answeredAt(): Date | null { return this._answeredAt; }

  /* internal */ answer(response: string, at: Date): void {
    if (this._status !== TSRQueryStatus.OPEN) {
      throw new InvalidStateTransitionError(this._status, 'answer');
    }
    if (response.trim().length === 0) {
      throw new BusinessRuleViolationError('Response text is required');
    }
    this._response = response;
    this._status = TSRQueryStatus.ANSWERED;
    this._answeredAt = at;
  }

  /* internal */ close(): void {
    if (this._status === TSRQueryStatus.CLOSED) return;
    this._status = TSRQueryStatus.CLOSED;
  }
}
