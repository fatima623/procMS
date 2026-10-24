import { Entity } from '../shared/Entity';
import { ApprovalRole, ApprovalStepStatus } from './ApprovalTypes';

export interface ApprovalStepProps {
  readonly chainId: string;
  readonly stepIndex: number;
  readonly role: ApprovalRole;
  readonly assignedUserId: string | null;
  readonly status: ApprovalStepStatus;
  readonly decidedByUserId: string | null;
  readonly decidedAt: Date | null;
  readonly comments: string | null;
}

/**
 * One step inside an ApprovalChain. The chain mutates its steps directly;
 * no external caller should ever reach a step without going through its
 * chain.
 */
export class ApprovalStep extends Entity<string> {
  public readonly chainId: string;
  public readonly stepIndex: number;
  public readonly role: ApprovalRole;
  private _assignedUserId: string | null;
  private _status: ApprovalStepStatus;
  private _decidedByUserId: string | null;
  private _decidedAt: Date | null;
  private _comments: string | null;

  private constructor(id: string, props: ApprovalStepProps) {
    super(id);
    this.chainId = props.chainId;
    this.stepIndex = props.stepIndex;
    this.role = props.role;
    this._assignedUserId = props.assignedUserId;
    this._status = props.status;
    this._decidedByUserId = props.decidedByUserId;
    this._decidedAt = props.decidedAt;
    this._comments = props.comments;
  }

  public static create(id: string, props: ApprovalStepProps): ApprovalStep {
    return new ApprovalStep(id, props);
  }

  public get assignedUserId(): string | null { return this._assignedUserId; }
  public get status(): ApprovalStepStatus { return this._status; }
  public get decidedByUserId(): string | null { return this._decidedByUserId; }
  public get decidedAt(): Date | null { return this._decidedAt; }
  public get comments(): string | null { return this._comments; }

  /** Called from inside ApprovalChain only. */
  /* internal */ setDecision(
    status: ApprovalStepStatus,
    userId: string,
    at: Date,
    comments: string | null,
  ): void {
    this._status = status;
    this._decidedByUserId = userId;
    this._decidedAt = at;
    this._comments = comments;
  }
}
