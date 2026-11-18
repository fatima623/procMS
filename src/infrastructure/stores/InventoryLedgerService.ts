import { ulid } from 'ulid';
import { InventoryLedgerKind } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { CreateInventoryLedgerEntryInput } from '@/interfaces/http/schemas/inventoryLedger';

export const inventoryLedgerService = {
  async list(filter?: { kind?: InventoryLedgerKind }) {
    return prisma.inventoryLedgerEntry.findMany({
      where: filter?.kind ? { kind: filter.kind } : {},
      orderBy: { happenedOn: 'desc' },
      include: {
        enteredBy: { select: { displayName: true } },
      },
    });
  },

  async create(userId: string, input: CreateInventoryLedgerEntryInput): Promise<{ id: string }> {
    const id = ulid();
    await prisma.inventoryLedgerEntry.create({
      data: {
        id,
        kind: input.kind,
        happenedOn: input.happenedOn ?? new Date(),
        sourceDemandId: input.sourceDemandId || null,
        sourceITPerformaId: input.sourceITPerformaId || null,
        itemName: input.itemName,
        quantity: input.quantity,
        uom: input.uom,
        enteredByUserId: userId,
        remarks: input.remarks ?? null,
      },
    });
    return { id };
  },
};
