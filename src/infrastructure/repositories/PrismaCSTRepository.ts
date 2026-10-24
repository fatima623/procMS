import type { Prisma, PrismaClient, CST as DbCST, CSTLine as DbLine } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { CST } from '@/domain/cst/CST';
import { CSTLine } from '@/domain/cst/CSTLine';
import type { CSTStatus } from '@/domain/cst/CSTStatus';
import type { CSTRepository } from '@/application/ports/CSTRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

export class PrismaCSTRepository implements CSTRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<CST | null> {
    const row = await this.tx.cST.findUnique({
      where: { id },
      include: { lines: { include: { commercialOffer: { select: { firmId: true } } }, orderBy: { rank: 'asc' } } },
    });
    return row ? this.toAggregate(row, row.lines) : null;
  }

  public async findByIT(itPerformaId: string): Promise<CST | null> {
    const row = await this.tx.cST.findUnique({
      where: { itPerformaId },
      include: { lines: { include: { commercialOffer: { select: { firmId: true } } }, orderBy: { rank: 'asc' } } },
    });
    return row ? this.toAggregate(row, row.lines) : null;
  }

  public async insert(cst: CST): Promise<void> {
    await this.tx.cST.create({
      data: {
        id: cst.id,
        itPerformaId: cst.itPerformaId,
        preparedByUserId: cst.preparedByUserId,
        status: cst.status,
        singleQuote: cst.singleQuote,
        approvalPerformaKey: cst.approvalPerformaKey,
        approvedAt: cst.approvedAt,
        version: 0,
        lines: {
          create: cst.lines.map((l) => ({
            id: l.id,
            commercialOfferId: l.commercialOfferId,
            rank: l.rank,
            recommendedForAward: l.recommendedForAward,
            justification: l.justification,
          })),
        },
      },
    });
    cst.markPersisted(0);
  }

  public async save(cst: CST): Promise<void> {
    const expected = cst.version;
    const result = await this.tx.cST.updateMany({
      where: { id: cst.id, version: expected },
      data: {
        status: cst.status,
        approvalPerformaKey: cst.approvalPerformaKey,
        approvedAt: cst.approvedAt,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('CST', cst.id);
    }
    cst.markPersisted(expected + 1);
  }

  private toAggregate(
    row: DbCST,
    lineRows: (DbLine & { commercialOffer: { firmId: string } })[],
  ): CST {
    const lines = lineRows.map((l) =>
      CSTLine.create(l.id, {
        cstId: l.cstId,
        commercialOfferId: l.commercialOfferId,
        rank: l.rank,
        recommendedForAward: l.recommendedForAward,
        justification: l.justification,
      }),
    );
    const firmMap = new Map(lineRows.map((l) => [l.commercialOfferId, l.commercialOffer.firmId]));

    return CST.rehydrate(row.id, row.version, {
      itPerformaId: row.itPerformaId,
      preparedByUserId: row.preparedByUserId,
      singleQuote: row.singleQuote,
      status: row.status as CSTStatus,
      approvedAt: row.approvedAt,
      approvalPerformaKey: row.approvalPerformaKey,
      lines,
      lineFirmIds: firmMap,
      createdAt: row.createdAt,
    });
  }
}
