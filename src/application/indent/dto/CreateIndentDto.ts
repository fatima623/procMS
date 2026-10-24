import type { IndentPriority, IndentType } from '@/domain/indent/IndentStatus';

export interface CreateIndentItemDto {
  readonly lineNo: number;
  readonly itemCode?: string;
  readonly description: string;
  readonly specifications?: Record<string, unknown>;
  readonly quantity: number;
  readonly uom: string;
  /** Minor units (fils/paisa/cents). See Money for rationale. */
  readonly estimatedUnitPriceMinor: string;
  readonly currency: string;
}

export interface CreateIndentDto {
  readonly subject: string;
  readonly justification?: string;
  readonly type: IndentType;
  readonly priority: IndentPriority;
  readonly estimatedValueMinor: string;      // sum of lines; the aggregate verifies the match
  readonly currency: string;
  readonly fiscalYearId: string;
  readonly budgetHeadId: string;
  readonly items: readonly CreateIndentItemDto[];
}
