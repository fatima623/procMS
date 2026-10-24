import { Entity } from '../shared/Entity';
import type { TSRVerdict } from './TSRTypes';

export interface TSREvaluationProps {
  readonly tsrId: string;
  readonly technicalOfferId: string;
  readonly verdict: TSRVerdict;
  readonly remarks: string | null;
  readonly evaluatedAt: Date;
}

export class TSREvaluation extends Entity<string> {
  public readonly tsrId: string;
  public readonly technicalOfferId: string;
  public readonly evaluatedAt: Date;
  private _verdict: TSRVerdict;
  private _remarks: string | null;

  private constructor(id: string, props: TSREvaluationProps) {
    super(id);
    this.tsrId = props.tsrId;
    this.technicalOfferId = props.technicalOfferId;
    this.evaluatedAt = props.evaluatedAt;
    this._verdict = props.verdict;
    this._remarks = props.remarks;
  }

  public static create(id: string, props: TSREvaluationProps): TSREvaluation {
    return new TSREvaluation(id, props);
  }

  public get verdict(): TSRVerdict { return this._verdict; }
  public get remarks(): string | null { return this._remarks; }

  /* internal */ update(verdict: TSRVerdict, remarks: string | null): void {
    this._verdict = verdict;
    this._remarks = remarks;
  }
}
