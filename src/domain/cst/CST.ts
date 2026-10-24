import { AggregateRoot } from '../shared/AggregateRoot';
import {
  BusinessRuleViolationError,
  InvalidStateTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { CSTLine } from './CSTLine';
import { CSTStatus } from './CSTStatus';
import {
  CSTCreatedEvent,
  CSTStatusChangedEvent,
  CSTAwardRecommendedEvent,
} from './events/CSTEvents';

export interface CSTProps {
  readonly itPerformaId: string;
  readonly preparedByUserId: string;
  readonly singleQuote: boolean;
}

/** Lightweight DTO used when preparing a CST from existing commercial offers. */
export interface CSTLineInput {
  readonly commercialOfferId: string;
  readonly firmId: string;
  readonly rank: number;
  readonly recommendedForAward: boolean;
  readonly justification?: string;
}

/**
 * Comparative Statement aggregate. Owns the ranked set of commercial offers
 * considered for award and the recommendation. The owning Indent and the
 * PurchaseRequisition sit around it; the CST itself doesn't know about them.
 *
 * singleQuote is a BUSINESS INPUT (not auto-derived) because a procurement
 * may legitimately proceed as single-quote even with offers rejected during
 * TSR for non-price reasons. The use-case computes a suggested value and
 * passes it in.
 */
export class CST extends AggregateRoot<string> {
  public readonly itPerformaId: string;
  public readonly preparedByUserId: string;
  public readonly singleQuote: boolean;
  public readonly createdAt: Date;

  private _status: CSTStatus;
  private _approvedAt: Date | null;
  private _approvalPerformaKey: string | null;
  private readonly _lines: CSTLine[];
  private readonly _lineFirmIds: Map<string, string>; // commercialOfferId → firmId (not persisted; needed for cascade)

  private constructor(
    id: string,
    version: number,
    props: CSTProps & {
      status: CSTStatus;
      approvedAt: Date | null;
      approvalPerformaKey: string | null;
      lines: CSTLine[];
      lineFirmIds: Map<string, string>;
      createdAt: Date;
    },
  ) {
    super(id, version);
    this.itPerformaId = props.itPerformaId;
    this.preparedByUserId = props.preparedByUserId;
    this.singleQuote = props.singleQuote;
    this.createdAt = props.createdAt;
    this._status = props.status;
    this._approvedAt = props.approvedAt;
    this._approvalPerformaKey = props.approvalPerformaKey;
    this._lines = props.lines;
    this._lineFirmIds = props.lineFirmIds;
  }

  public static create(
    id: string,
    props: CSTProps,
    lineIdFactory: () => string,
    lineInputs: readonly CSTLineInput[],
    now: Date,
  ): CST {
    if (lineInputs.length === 0) {
      throw new ValidationError('CST must have at least one line');
    }
    const recommended = lineInputs.filter((l) => l.recommendedForAward);
    if (recommended.length !== 1) {
      throw new BusinessRuleViolationError(
        'Exactly one line must be marked recommendedForAward',
      );
    }
    // Enforce unique rank values
    const ranks = new Set<number>();
    for (const l of lineInputs) {
      if (ranks.has(l.rank)) {
        throw new BusinessRuleViolationError(`Duplicate rank ${l.rank}`);
      }
      ranks.add(l.rank);
    }
    const lines = lineInputs.map((l) =>
      CSTLine.create(lineIdFactory(), {
        cstId: id,
        commercialOfferId: l.commercialOfferId,
        rank: l.rank,
        recommendedForAward: l.recommendedForAward,
        justification: l.justification ?? null,
      }),
    );
    const firmMap = new Map(lineInputs.map((l) => [l.commercialOfferId, l.firmId]));

    const cst = new CST(id, 0, {
      ...props,
      status: CSTStatus.DRAFT,
      approvedAt: null,
      approvalPerformaKey: null,
      lines,
      lineFirmIds: firmMap,
      createdAt: now,
    });
    cst.addEvent(new CSTCreatedEvent(id, props.itPerformaId, props.preparedByUserId, props.singleQuote));
    const rec = recommended[0]!;
    cst.addEvent(new CSTAwardRecommendedEvent(id, rec.commercialOfferId, rec.firmId, props.preparedByUserId));
    return cst;
  }

  public static rehydrate(
    id: string,
    version: number,
    props: CSTProps & {
      status: CSTStatus;
      approvedAt: Date | null;
      approvalPerformaKey: string | null;
      lines: CSTLine[];
      lineFirmIds: Map<string, string>;
      createdAt: Date;
    },
  ): CST {
    return new CST(id, version, props);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  public get status(): CSTStatus { return this._status; }
  public get approvedAt(): Date | null { return this._approvedAt; }
  public get approvalPerformaKey(): string | null { return this._approvalPerformaKey; }
  public get lines(): readonly CSTLine[] { return [...this._lines]; }

  /** Returns the winning (recommended) commercial offer id and firm id. */
  public recommendedAward(): { commercialOfferId: string; firmId: string } {
    const winner = this._lines.find((l) => l.recommendedForAward);
    if (!winner) {
      throw new BusinessRuleViolationError('No recommended award on CST');
    }
    const firmId = this._lineFirmIds.get(winner.commercialOfferId);
    if (!firmId) {
      throw new BusinessRuleViolationError('Firm mapping missing for recommended line');
    }
    return { commercialOfferId: winner.commercialOfferId, firmId };
  }

  // ---------------------------------------------------------------------------
  // Commands
  // ---------------------------------------------------------------------------

  public startApproval(actorUserId: string): void {
    this.transition(CSTStatus.DRAFT, CSTStatus.IN_APPROVAL, 'startApproval', actorUserId);
  }

  /** Cascade from ApprovalChain terminal APPROVED. */
  public markChainApproved(actorUserId: string, now: Date): void {
    this.transition(CSTStatus.IN_APPROVAL, CSTStatus.APPROVED, 'chain.approve', actorUserId);
    this._approvedAt = now;
  }

  public markChainRejected(actorUserId: string, reason: string): void {
    this.transition(CSTStatus.IN_APPROVAL, CSTStatus.REJECTED, 'chain.reject', actorUserId, reason);
  }

  public attachApprovalPerformaKey(key: string): void {
    this._approvalPerformaKey = key;
  }

  private transition(from: CSTStatus, to: CSTStatus, event: string, actorUserId: string, reason?: string): void {
    if (this._status !== from) {
      throw new InvalidStateTransitionError(this._status, event);
    }
    this._status = to;
    this.addEvent(new CSTStatusChangedEvent(this.id, from, to, actorUserId, reason));
  }
}
