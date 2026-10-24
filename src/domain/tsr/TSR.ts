import { AggregateRoot } from '../shared/AggregateRoot';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  NotFoundError,
  ValidationError,
} from '../errors/DomainError';
import { TSREvaluation } from './TSREvaluation';
import { TSRQuery } from './TSRQuery';
import { TSRQueryStatus, TSRStatus, TSRVerdict } from './TSRTypes';
import {
  TSRCreatedEvent,
  TSREvaluationRecordedEvent,
  TSRQueryAnsweredEvent,
  TSRQueryRaisedEvent,
  TSRStatusChangedEvent,
} from './events/TSREvents';

export interface TSRProps {
  readonly itPerformaId: string;
  readonly inspectorateUserId: string;
  readonly summary?: string;
}

/**
 * Technical Scrutiny Report — one per IT. Aggregates all technical-offer
 * evaluations and all queries raised to firms. Terminal state COMPLETED
 * triggers (externally) the opening of commercial offers for ACCEPTED firms.
 */
export class TSR extends AggregateRoot<string> {
  public readonly itPerformaId: string;
  public readonly inspectorateUserId: string;
  public readonly createdAt: Date;

  private _status: TSRStatus;
  private _summary: string | null;
  private _submittedAt: Date | null;
  private _completedAt: Date | null;
  private readonly _evaluations: TSREvaluation[];
  private readonly _queries: TSRQuery[];

  private constructor(
    id: string,
    version: number,
    props: Omit<TSRProps, 'summary'> & {
      status: TSRStatus;
      summary: string | null;
      submittedAt: Date | null;
      completedAt: Date | null;
      evaluations: TSREvaluation[];
      queries: TSRQuery[];
      createdAt: Date;
    },
  ) {
    super(id, version);
    this.itPerformaId = props.itPerformaId;
    this.inspectorateUserId = props.inspectorateUserId;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._summary = props.summary;
    this._submittedAt = props.submittedAt;
    this._completedAt = props.completedAt;
    this._evaluations = props.evaluations;
    this._queries = props.queries;
  }

  public static create(id: string, props: TSRProps, now: Date): TSR {
    const tsr = new TSR(id, 0, {
      itPerformaId: props.itPerformaId,
      inspectorateUserId: props.inspectorateUserId,
      status: TSRStatus.DRAFT,
      summary: props.summary ?? null,
      submittedAt: null,
      completedAt: null,
      evaluations: [],
      queries: [],
      createdAt: now,
    });
    tsr.addEvent(new TSRCreatedEvent(id, props.itPerformaId, props.inspectorateUserId));
    return tsr;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: Omit<TSRProps, 'summary'> & {
      status: TSRStatus;
      summary: string | null;
      submittedAt: Date | null;
      completedAt: Date | null;
      evaluations: TSREvaluation[];
      queries: TSRQuery[];
      createdAt: Date;
    },
  ): TSR {
    return new TSR(id, version, props);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public get status(): TSRStatus { return this._status; }
  public get summary(): string | null { return this._summary; }
  public get submittedAt(): Date | null { return this._submittedAt; }
  public get completedAt(): Date | null { return this._completedAt; }
  public get evaluations(): readonly TSREvaluation[] { return [...this._evaluations]; }
  public get queries(): readonly TSRQuery[] { return [...this._queries]; }

  public isAccepted(technicalOfferId: string): boolean {
    return this._evaluations.some(
      (e) => e.technicalOfferId === technicalOfferId && e.verdict === TSRVerdict.ACCEPTED,
    );
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  public recordEvaluation(
    evaluationId: string,
    actorUserId: string,
    technicalOfferId: string,
    verdict: TSRVerdict,
    remarks: string | null,
    now: Date,
  ): void {
    this.assertEditable('recordEvaluation');
    if (verdict === TSRVerdict.REJECTED && (!remarks || remarks.trim().length === 0)) {
      throw new BusinessRuleViolationError('Rejection remarks are required');
    }
    const existing = this._evaluations.find((e) => e.technicalOfferId === technicalOfferId);
    if (existing) {
      existing.update(verdict, remarks);
    } else {
      this._evaluations.push(
        TSREvaluation.create(evaluationId, {
          tsrId: this.id,
          technicalOfferId,
          verdict,
          remarks,
          evaluatedAt: now,
        }),
      );
    }
    this.addEvent(new TSREvaluationRecordedEvent(this.id, technicalOfferId, verdict, actorUserId, remarks));
  }

  public raiseQuery(
    queryId: string,
    actorUserId: string,
    firmId: string,
    question: string,
    now: Date,
  ): void {
    this.assertEditable('raiseQuery');
    if (question.trim().length === 0) {
      throw new ValidationError('Query text is required', { question: 'required' });
    }
    this._queries.push(
      TSRQuery.create(queryId, {
        tsrId: this.id,
        firmId,
        question,
        response: null,
        status: TSRQueryStatus.OPEN,
        askedAt: now,
        answeredAt: null,
      }),
    );
    if (this._status === TSRStatus.DRAFT) {
      const prev = this._status;
      this._status = TSRStatus.QUERIES_RAISED;
      this.addEvent(new TSRStatusChangedEvent(this.id, prev, this._status, actorUserId));
    }
    this.addEvent(new TSRQueryRaisedEvent(this.id, queryId, firmId, actorUserId));
  }

  public answerQuery(queryId: string, actorUserId: string, firmId: string, response: string, now: Date): void {
    const q = this._queries.find((x) => x.id === queryId);
    if (!q) throw new NotFoundError('TSRQuery', queryId);
    if (q.firmId !== firmId) {
      throw new BusinessRuleViolationError('Query belongs to a different firm');
    }
    q.answer(response, now);
    this.addEvent(new TSRQueryAnsweredEvent(this.id, queryId, firmId, actorUserId));
  }

  public submit(actorUserId: string, summary: string, now: Date): void {
    this.assertEditable('submit');
    if (this._evaluations.length === 0) {
      throw new BusinessRuleViolationError('TSR must have at least one evaluation to submit');
    }
    const openQueries = this._queries.filter((q) => q.status === TSRQueryStatus.OPEN);
    if (openQueries.length > 0) {
      throw new BusinessRuleViolationError(
        `Cannot submit TSR with ${openQueries.length} open ${openQueries.length === 1 ? 'query' : 'queries'}`,
      );
    }
    const prev = this._status;
    this._status = TSRStatus.SUBMITTED;
    this._submittedAt = now;
    this._summary = summary;
    this.addEvent(new TSRStatusChangedEvent(this.id, prev, this._status, actorUserId));
  }

  public complete(actorUserId: string, now: Date): void {
    if (this._status !== TSRStatus.SUBMITTED) {
      throw new InvalidStateTransitionError(this._status, 'complete');
    }
    const prev = this._status;
    this._status = TSRStatus.COMPLETED;
    this._completedAt = now;
    this.addEvent(new TSRStatusChangedEvent(this.id, prev, this._status, actorUserId));
    // Close any still-open queries silently.
    for (const q of this._queries) q.close();
  }

  private assertEditable(op: string): void {
    if (this._status === TSRStatus.COMPLETED || this._status === TSRStatus.SUBMITTED) {
      throw new InvalidStateTransitionError(this._status, op);
    }
  }
}
