import { Entity } from '../shared/Entity';
import { Money } from '../shared/Money';
import { ValidationError } from '../errors/DomainError';

export interface IndentItemProps {
  readonly indentId: string;
  readonly lineNo: number;
  readonly itemCode?: string;
  readonly description: string;
  readonly specifications?: Readonly<Record<string, unknown>>;
  readonly quantity: number;
  readonly uom: string;
  readonly estimatedUnitPrice: Money;
}

/**
 * Line item on an Indent. Local entity — only reachable through its Indent
 * aggregate root; never persisted or looked up directly.
 */
export class IndentItem extends Entity<string> {
  public readonly indentId: string;
  public readonly lineNo: number;
  public readonly itemCode: string | undefined;
  public readonly description: string;
  public readonly specifications: Readonly<Record<string, unknown>> | undefined;
  public readonly quantity: number;
  public readonly uom: string;
  public readonly estimatedUnitPrice: Money;

  private constructor(id: string, props: IndentItemProps) {
    super(id);
    this.indentId = props.indentId;
    this.lineNo = props.lineNo;
    this.itemCode = props.itemCode;
    this.description = props.description;
    this.specifications = props.specifications;
    this.quantity = props.quantity;
    this.uom = props.uom;
    this.estimatedUnitPrice = props.estimatedUnitPrice;
  }

  public static create(id: string, props: IndentItemProps): IndentItem {
    if (props.quantity <= 0) {
      throw new ValidationError('Item quantity must be positive', { quantity: 'must be > 0' });
    }
    if (props.description.trim().length === 0) {
      throw new ValidationError('Item description is required', { description: 'required' });
    }
    if (props.lineNo < 1) {
      throw new ValidationError('Line number must be ≥ 1', { lineNo: 'must be >= 1' });
    }
    return new IndentItem(id, props);
  }

  public estimatedLineTotal(): Money {
    // quantity is a decimal; keep math in minor units. We treat `quantity`
    // as having up to 4 decimal places (matching schema Decimal(20,4)).
    const scaled = BigInt(Math.round(this.quantity * 10_000));
    const totalMinor = (this.estimatedUnitPrice.amountMinor * scaled) / 10_000n;
    return Money.of(totalMinor, this.estimatedUnitPrice.currency);
  }
}
