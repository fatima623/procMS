import type { Prisma, PrismaClient, TechnicalOffer as DbRow } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { TechnicalOffer } from '@/domain/offers/TechnicalOffer';
import type { OfferStatus } from '@/domain/offers/OfferStatus';
import type { TechnicalOfferRepository } from '@/application/ports/TechnicalOfferRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaTechnicalOfferRepository implements TechnicalOfferRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<TechnicalOffer | null> {
    const row = await this.tx.technicalOffer.findUnique({ where: { id } });
    return row ? this.toAggregate(row) : null;
  }

  public async findByIT(itPerformaId: string): Promise<readonly TechnicalOffer[]> {
    const rows = await this.tx.technicalOffer.findMany({
      where: { itPerformaId },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map((r) => this.toAggregate(r));
  }

  public async findForFirm(itPerformaId: string, firmId: string): Promise<TechnicalOffer | null> {
    const row = await this.tx.technicalOffer.findUnique({
      where: { itPerformaId_firmId: { itPerformaId, firmId } },
    });
    return row ? this.toAggregate(row) : null;
  }

  public async insert(offer: TechnicalOffer): Promise<void> {
    await this.tx.technicalOffer.create({
      data: {
        id: offer.id,
        itPerformaId: offer.itPerformaId,
        firmId: offer.firmId,
        submittedAt: offer.submittedAt,
        documentKey: offer.documentKey,
        status: offer.status,
        remarks: offer.remarks,
        version: 0,
      },
    });
    offer.markPersisted(0);
  }

  public async save(offer: TechnicalOffer): Promise<void> {
    const expected = offer.version;
    const result = await this.tx.technicalOffer.updateMany({
      where: { id: offer.id, version: expected },
      data: {
        status: offer.status,
        remarks: offer.remarks,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('TechnicalOffer', offer.id);
    }
    offer.markPersisted(expected + 1);
  }

  private toAggregate(row: DbRow): TechnicalOffer {
    return TechnicalOffer.rehydrate(row.id, row.version, {
      itPerformaId: row.itPerformaId,
      firmId: row.firmId,
      documentKey: row.documentKey ?? undefined,
      status: row.status as OfferStatus,
      submittedAt: row.submittedAt,
      remarks: row.remarks,
    });
  }
}
