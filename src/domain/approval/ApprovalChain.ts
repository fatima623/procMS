import { AggregateRoot } from '../shared/AggregateRoot';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { ApprovalStep } from './ApprovalStep';
import {
  ApprovalChainStatus,
  ApprovalRole,
  ApprovalStepStatus,
  ApprovalSubject,
} from './ApprovalTypes';
import {
  ApprovalChainStartedEvent,
  ApprovalChainCompletedEvent,
  ApprovalStepDecidedEvent,
} from './events/ApprovalEvents';

export type StepIdFactory = () => string;

export interface ApprovalChainProps {
  readonly subject: ApprovalSubject;
  readonly subjectId: string;
  readonly status: ApprovalChainStatus;
  readonly currentIndex: number;
  readonly steps: ApprovalStep[];
  readonly createdAt: Date;
  readonly completedAt: Date | null;
}

/**
 * Multi-step approval chain for an indent / IT proforma / CST.
 *
 * Invariants:
 *   - Steps form a contiguous zero-indexed sequence.
 *   - Exactly one step is PENDING at any time (unless chain is terminal).
 *   - A role may decide only on the step at `currentIndex`.
 *   - Any REJECTED or RETURNED step terminates the chain.
 */
export class ApprovalChain extends AggregateRoot<string> {
  public readonly subject: ApprovalSubject;
  public readonly subjectId: string;
  public readonly createdAt: Date;
  private _status: ApprovalChainStatus;
  private _currentIndex: number;
  private _completedAt: Date | null;
  private readonly _steps: ApprovalStep[];

  private constructor(id: string, version: number, props: ApprovalChainProps) {
    super(id, version);
    this.subject = props.subject;
    this.subjectId = props.subjectId;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._currentIndex = props.currentIndex;
    this._completedAt = props.completedAt;
    this._steps = props.steps;
  }

  public static start(
    id: string,
    subject: ApprovalSubject,
    subjectId: string,
    template: readonly ApprovalRole[],
    stepIdFactory: StepIdFactory,
    now: Date,
  ): ApprovalChain {
    if (template.length === 0) {
      throw new ValidationError('Approval chain template must have at least one step');
    }
    const steps = template.map((role, idx) =>
      ApprovalStep.create(stepIdFactory(), {
        chainId: id,
        stepIndex: idx,
        role,
        assignedUserId: null,
        status: ApprovalStepStatus.PENDING,
        decidedByUserId: null,
        decidedAt: null,
        comments: null,
      }),
    );
    const chain = new ApprovalChain(id, 0, {
      subject,
      subjectId,
      status: ApprovalChainStatus.PENDING,
      currentIndex: 0,
      steps,
      createdAt: now,
      completedAt: null,
    });
    chain.addEvent(new ApprovalChainStartedEvent(id, subject, subjectId, template));
    return chain;
  }

  public static rehydrate(id: string, version: number, props: ApprovalChainProps): ApprovalChain {
    return new ApprovalChain(id, version, props);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public get status(): ApprovalChainStatus { return this._status; }
  public get currentIndex(): number { return this._currentIndex; }
  public get completedAt(): Date | null { return this._completedAt; }
  public get steps(): readonly ApprovalStep[] { return [...this._steps]; }

  public currentStep(): ApprovalStep | null {
    if (this._status !== ApprovalChainStatus.PENDING) return null;
    return this._steps[this._currentIndex] ?? null;
  }

  public isComplete(): boolean {
    return this._status !== ApprovalChainStatus.PENDING;
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  /**
   * Decide on the current step. The caller must verify (above the aggregate)
   * that `actorUserId` holds the step's role — the chain does not know about
   * users or roles outside of what the step records.
   */
  public decide(
    actorUserId: string,
    decision: Extract<ApprovalStepStatus, 'APPROVED' | 'REJECTED' | 'RETURNED'>,
    comments: string | null,
    now: Date,
  ): void {
    if (this._status !== ApprovalChainStatus.PENDING) {
      throw new InvalidStateTransitionError(this._status, `decide:${decision}`);
    }
    const step = this._steps[this._currentIndex];
    if (!step) {
      throw new BusinessRuleViolationError(`No step at index ${this._currentIndex}`);
    }
    if (step.status !== ApprovalStepStatus.PENDING) {
      throw new BusinessRuleViolationError(`Current step is not PENDING (got ${step.status})`);
    }

    step.setDecision(decision, actorUserId, now, comments);
    this.addEvent(
      new ApprovalStepDecidedEvent(
        this.id,
        step.stepIndex,
        step.role,
        decision,
        actorUserId,
        comments,
      ),
    );

    if (decision === ApprovalStepStatus.APPROVED) {
      // advance or complete
      if (this._currentIndex === this._steps.length - 1) {
        this.complete(ApprovalChainStatus.APPROVED, now);
      } else {
        this._currentIndex += 1;
      }
    } else {
      // REJECTED or RETURNED both terminate the chain
      this.complete(ApprovalChainStatus.REJECTED, now);
    }
  }

  /** Withdraw an in-progress chain (e.g. indent was cancelled upstream). */
  public withdraw(now: Date): void {
    if (this._status !== ApprovalChainStatus.PENDING) {
      throw new InvalidStateTransitionError(this._status, 'withdraw');
    }
    this.complete(ApprovalChainStatus.WITHDRAWN, now);
  }

  private complete(finalStatus: ApprovalChainStatus, now: Date): void {
    this._status = finalStatus;
    this._completedAt = now;
    this.addEvent(
      new ApprovalChainCompletedEvent(this.id, this.subject, this.subjectId, finalStatus),
    );
  }
}
