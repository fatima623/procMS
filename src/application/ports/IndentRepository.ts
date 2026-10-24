import type { Indent } from '@/domain/indent/Indent';
import type { IndentStatus } from '@/domain/indent/IndentStatus';

export interface IndentPage {
  readonly items: readonly Indent[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ListIndentsFilter {
  readonly statuses?: readonly IndentStatus[];
  readonly indenterId?: string;
  readonly sectionId?: string;
  readonly assignedAdpId?: string;
  readonly fiscalYearId?: string;
  readonly search?: string;        // matches indentNumber / controlNumber / subject
  readonly page?: number;          // 1-based
  readonly pageSize?: number;      // default 25, max 200
}

export interface IndentRepository {
  /**
   * Load an indent by id (including items). Returns null if not found. The
   * repository MUST set the aggregate's `version` so optimistic concurrency
   * works on save.
   */
  findById(id: string): Promise<Indent | null>;

  /** Load by business key — e.g. for duplicate detection. */
  findByIndentNumber(number: string): Promise<Indent | null>;

  /** Insert a new aggregate. Caller passes a factory-created aggregate at version 0. */
  insert(indent: Indent): Promise<void>;

  /**
   * Save an existing aggregate using optimistic concurrency. Throws
   * ConcurrencyConflictError if the DB version doesn't match the
   * aggregate's loaded version.
   */
  save(indent: Indent): Promise<void>;

  list(filter: ListIndentsFilter): Promise<IndentPage>;
}
