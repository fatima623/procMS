import { Entity } from '../shared/Entity';
import { ValidationError } from '../errors/DomainError';

export interface CSTLineProps {
  readonly cstId: string;
  readonly commercialOfferId: string;
  readonly rank: number;
  readonly recommendedForAward: boolean;
  readonly justification: string | null;
}

export class CSTLine extends Entity<string> {
  public readonly cstId: string;
  public readonly commercialOfferId: string;
  public readonly rank: number;
  public readonly recommendedForAward: boolean;
  public readonly justification: string | null;

  private constructor(id: string, props: CSTLineProps) {
    super(id);
    this.cstId = props.cstId;
    this.commercialOfferId = props.commercialOfferId;
    this.rank = props.rank;
    this.recommendedForAward = props.recommendedForAward;
    this.justification = props.justification;
  }

  public static create(id: string, props: CSTLineProps): CSTLine {
    if (props.rank < 1) throw new ValidationError('rank must be ≥ 1');
    return new CSTLine(id, props);
  }
}
