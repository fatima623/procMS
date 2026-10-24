import type { IndentRepository } from './IndentRepository';
import type { ApprovalChainRepository } from './ApprovalChainRepository';
import type { ITPerformaRepository } from './ITPerformaRepository';
import type { TechnicalOfferRepository } from './TechnicalOfferRepository';
import type { TSRRepository } from './TSRRepository';
import type { CommercialOfferRepository } from './CommercialOfferRepository';
import type { CSTRepository } from './CSTRepository';
import type { PurchaseRequisitionRepository } from './PurchaseRequisitionRepository';
import type { AuditLogWriter } from './AuditLogWriter';

/**
 * Transactional context handed to a use-case. All repository calls executed
 * through its handles participate in the SAME DB transaction. The use-case
 * does not know whether that transaction is Prisma `$transaction`, an outer
 * MySQL savepoint, or an in-memory fake.
 */
export interface UnitOfWorkHandles {
  readonly indents: IndentRepository;
  readonly chains: ApprovalChainRepository;
  readonly itProformas: ITPerformaRepository;
  readonly technicalOffers: TechnicalOfferRepository;
  readonly tsrs: TSRRepository;
  readonly commercialOffers: CommercialOfferRepository;
  readonly csts: CSTRepository;
  readonly prs: PurchaseRequisitionRepository;
  readonly audit: AuditLogWriter;
}

export interface UnitOfWork {
  /**
   * Runs `work` in a transaction. The returned value is the use-case result.
   * Any thrown error causes a rollback.
   */
  run<T>(work: (handles: UnitOfWorkHandles) => Promise<T>): Promise<T>;
}
