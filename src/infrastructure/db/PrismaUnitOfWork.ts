import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import type { UnitOfWork, UnitOfWorkHandles } from '@/application/ports/UnitOfWork';
import { PrismaIndentRepository } from '../repositories/PrismaIndentRepository';
import { PrismaApprovalChainRepository } from '../repositories/PrismaApprovalChainRepository';
import { PrismaITPerformaRepository } from '../repositories/PrismaITPerformaRepository';
import { PrismaTechnicalOfferRepository } from '../repositories/PrismaTechnicalOfferRepository';
import { PrismaTSRRepository } from '../repositories/PrismaTSRRepository';
import { PrismaCommercialOfferRepository } from '../repositories/PrismaCommercialOfferRepository';
import { PrismaCSTRepository } from '../repositories/PrismaCSTRepository';
import { PrismaPurchaseRequisitionRepository } from '../repositories/PrismaPurchaseRequisitionRepository';
import { PrismaAuditLogWriter } from '../repositories/PrismaAuditLogWriter';

/**
 * Wraps a Prisma $transaction and hands repositories that bind to the TX
 * client. Any throw rolls back; a plain return commits.
 */
export class PrismaUnitOfWork implements UnitOfWork {
  constructor(private readonly client: PrismaClient) {}

  public async run<T>(work: (handles: UnitOfWorkHandles) => Promise<T>): Promise<T> {
    return this.client.$transaction(
      async (tx) => {
        const handles: UnitOfWorkHandles = {
          indents: new PrismaIndentRepository(tx),
          chains: new PrismaApprovalChainRepository(tx),
          itProformas: new PrismaITPerformaRepository(tx),
          technicalOffers: new PrismaTechnicalOfferRepository(tx),
          tsrs: new PrismaTSRRepository(tx),
          commercialOffers: new PrismaCommercialOfferRepository(tx),
          csts: new PrismaCSTRepository(tx),
          prs: new PrismaPurchaseRequisitionRepository(tx),
          audit: new PrismaAuditLogWriter(tx),
        };
        return work(handles);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15_000,
        maxWait: 3_000,
      },
    );
  }
}
