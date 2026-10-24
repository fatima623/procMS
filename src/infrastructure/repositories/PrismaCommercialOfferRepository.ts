import type { Prisma, PrismaClient, CommercialOffer as DbRow } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { CommercialOffer } from '@/domain/offers/CommercialOffer';
import { Money } from '@/domain/shared/Money';
import type { OfferStatus } from '@/domain/offers/OfferStatus';
import type { CommercialOfferRepository } from '@/application/ports/CommercialOfferRepository';
import { decimalToMinor, minorToDecimal } from '../common/decimal';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaCommercialOfferRepository implements CommercialOfferRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<CommercialOffer | null> {
    const row = await this.tx.commercialOffer.findUnique({ where: { id } });
    return row ? this.toAggregate(row) : null;
  }

  public async findByIT(itPerformaId: string): Promise<readonly CommercialOffer[]> {
    const rows = await this.tx.commercialOffer.findMany({
      where: { itPerformaId },
      orderBy: { openedAt: 'asc' },
    });
    return rows.map((r) => this.toAggregate(r));
  }

  public async findForFirm(itPerformaId: string, firmId: string): Promise<CommercialOffer | null> {
    const row = await this.tx.commercialOffer.findUnique({
      where: { itPerformaId_firmId: { itPerformaId, firmId } },
    });
    return row ? this.toAggregate(row) : null;
  }

  public async insert(offer: CommercialOffer): Promise<void> {
    await this.tx.commercialOffer.create({
      data: {
        id: offer.id,
        itPerformaId: offer.itPerformaId,
        firmId: offer.firmId,
        openedAt: offer.openedAt,
        totalPrice: minorToDecimal(offer.totalPrice.amountMinor),
        currency: offer.totalPrice.currency,
        deliveryWeeks: offer.deliveryWeeks,
        documentKey: offer.documentKey,
        status: offer.status,
        version: 0,
      },
    });
    offer.markPersisted(0);
  }

  public async save(offer: CommercialOffer): Promise<void> {
    const expected = offer.version;
    const result = await this.tx.commercialOffer.updateMany({
      where: { id: offer.id, version: expected },
      data: {
        status: offer.status,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('CommercialOffer', offer.id);
    }
    offer.markPersisted(expected + 1);
  }

  private toAggregate(row: DbRow): CommercialOffer {
    return CommercialOffer.rehydrate(row.id, row.version, {
      itPerformaId: row.itPerformaId,
      firmId: row.firmId,
      totalPrice: Money.of(decimalToMinor(row.totalPrice as unknown as string), row.currency),
      deliveryWeeks: row.deliveryWeeks ?? undefined,
      documentKey: row.documentKey ?? undefined,
      status: row.status as OfferStatus,
      openedAt: row.openedAt,
    });
  }
}
