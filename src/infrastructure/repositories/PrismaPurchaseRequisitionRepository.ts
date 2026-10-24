import type { Prisma, PrismaClient, PurchaseRequisition as DbRow } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { PurchaseRequisition } from '@/domain/pr/PurchaseRequisition';
import { Money } from '@/domain/shared/Money';
import type { PRStatus } from '@/domain/pr/PRStatus';
import type { PurchaseRequisitionRepository } from '@/application/ports/PurchaseRequisitionRepository';
import { decimalToMinor, minorToDecimal } from '../common/decimal';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaPurchaseRequisitionRepository implements PurchaseRequisitionRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<PurchaseRequisition | null> {
    const row = await this.tx.purchaseRequisition.findUnique({ where: { id } });
    return row ? this.toAggregate(row) : null;
  }

  public async findByCST(cstId: string): Promise<PurchaseRequisition | null> {
    const row = await this.tx.purchaseRequisition.findUnique({ where: { cstId } });
    return row ? this.toAggregate(row) : null;
  }

  public async findByPRNumber(prNumber: string): Promise<PurchaseRequisition | null> {
    const row = await this.tx.purchaseRequisition.findUnique({ where: { prNumber } });
    return row ? this.toAggregate(row) : null;
  }

  public async insert(pr: PurchaseRequisition): Promise<void> {
    await this.tx.purchaseRequisition.create({
      data: {
        id: pr.id,
        cstId: pr.cstId,
        firmId: pr.firmId,
        prNumber: pr.prNumber,
        amount: minorToDecimal(pr.amount.amountMinor),
        currency: pr.amount.currency,
        faxedAt: pr.faxedAt,
        status: pr.status,
      },
    });
    pr.markPersisted(0);
  }

  public async save(pr: PurchaseRequisition): Promise<void> {
    const result = await this.tx.purchaseRequisition.updateMany({
      where: { id: pr.id },
      data: {
        status: pr.status,
        faxedAt: pr.faxedAt,
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('PR', pr.id);
    }
    pr.markPersisted(pr.version + 1);
  }

  private toAggregate(row: DbRow): PurchaseRequisition {
    return PurchaseRequisition.rehydrate(row.id, 0, {
      cstId: row.cstId,
      firmId: row.firmId,
      prNumber: row.prNumber,
      amount: Money.of(decimalToMinor(row.amount as unknown as string), row.currency),
      status: row.status as PRStatus,
      faxedAt: row.faxedAt,
      createdAt: row.createdAt,
    });
  }
}
