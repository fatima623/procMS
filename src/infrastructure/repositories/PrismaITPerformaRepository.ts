import { Prisma, type PrismaClient, type ITPerforma as DbIT, type ITFirmInvite as DbInvite } from '@prisma/client';

import { ConcurrencyConflictError } from '@/domain/errors/DomainError';
import { ITPerforma } from '@/domain/itproforma/ITPerforma';
import type { ITStatus } from '@/domain/itproforma/ITStatus';
import type { ITPerformaRepository } from '@/application/ports/ITPerformaRepository';

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Maps the ITPerforma aggregate to/from its persistence rows. The invited
 * firms set is persisted as a diff: on save we compare the DB state to the
 * aggregate's current set and emit the required insert/delete rows. This
 * keeps saves O(delta) rather than O(firms).
 */
export class PrismaITPerformaRepository implements ITPerformaRepository {
  constructor(private readonly tx: Tx) {}

  public async findById(id: string): Promise<ITPerforma | null> {
    const row = await this.tx.iTPerforma.findUnique({
      where: { id },
      include: { firms: true },
    });
    if (!row) return null;
    return this.toAggregate(row, row.firms);
  }

  public async findByIndentId(indentId: string): Promise<ITPerforma | null> {
    const row = await this.tx.iTPerforma.findUnique({
      where: { indentId },
      include: { firms: true },
    });
    if (!row) return null;
    return this.toAggregate(row, row.firms);
  }

  public async findByReference(reference: string): Promise<ITPerforma | null> {
    const row = await this.tx.iTPerforma.findUnique({
      where: { reference },
      include: { firms: true },
    });
    if (!row) return null;
    return this.toAggregate(row, row.firms);
  }

  public async insert(it: ITPerforma): Promise<void> {
    await this.tx.iTPerforma.create({
      data: {
        id: it.id,
        indentId: it.indentId,
        reference: it.reference,
        checklist: (it.checklist as Prisma.InputJsonValue | undefined) ?? Prisma.JsonNull,
        status: it.status,
        preparedByUserId: it.preparedByUserId,
        dispatchedAt: it.dispatchedAt,
        closingAt: it.closingAt,
        version: 0,
        firms: {
          create: it.invitedFirms.map((firmId) => ({ firmId })),
        },
      },
    });
    it.markPersisted(0);
  }

  public async save(it: ITPerforma): Promise<void> {
    const expectedVersion = it.version;
    const result = await this.tx.iTPerforma.updateMany({
      where: { id: it.id, version: expectedVersion },
      data: {
        status: it.status,
        dispatchedAt: it.dispatchedAt,
        closingAt: it.closingAt,
        version: { increment: 1 },
      },
    });
    if (result.count === 0) {
      throw new ConcurrencyConflictError('ITPerforma', it.id);
    }

    // Diff and sync the firm-invite set.
    const current = await this.tx.iTFirmInvite.findMany({
      where: { itPerformaId: it.id },
      select: { firmId: true },
    });
    const currentSet = new Set(current.map((r) => r.firmId));
    const desiredSet = new Set(it.invitedFirms);
    const toAdd = [...desiredSet].filter((f) => !currentSet.has(f));
    const toRemove = [...currentSet].filter((f) => !desiredSet.has(f));

    if (toRemove.length > 0) {
      await this.tx.iTFirmInvite.deleteMany({
        where: { itPerformaId: it.id, firmId: { in: toRemove } },
      });
    }
    if (toAdd.length > 0) {
      await this.tx.iTFirmInvite.createMany({
        data: toAdd.map((firmId) => ({ itPerformaId: it.id, firmId })),
      });
    }
    it.markPersisted(expectedVersion + 1);
  }

  private toAggregate(row: DbIT, inviteRows: DbInvite[]): ITPerforma {
    return ITPerforma.rehydrate(row.id, row.version, {
      indentId: row.indentId,
      reference: row.reference,
      checklist: (row.checklist as Record<string, unknown> | null) ?? undefined,
      preparedByUserId: row.preparedByUserId,
      status: row.status as ITStatus,
      dispatchedAt: row.dispatchedAt,
      closingAt: row.closingAt,
      invitedFirms: inviteRows.map((r) => r.firmId),
      createdAt: row.createdAt,
    });
  }
}
