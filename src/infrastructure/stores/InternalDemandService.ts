import { ulid } from 'ulid';
import { InternalDemandStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateDemandInput,
  DemandItemInput,
  UpdateDemandInput,
} from '@/interfaces/http/schemas/internalDemand';

/**
 * Internal item demand: a section's upstream request for items.
 * NOT a procurement indent. Records state; does not block (compliance rule).
 */

async function nextDemandNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DEM/${year}/`;
  const count = await prisma.internalDemand.count({
    where: { demandNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

export const internalDemandService = {
  async list(filter?: { status?: InternalDemandStatus }) {
    return prisma.internalDemand.findMany({
      where: filter?.status ? { status: filter.status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { select: { displayName: true } },
        raisedForSection: { select: { code: true, name: true } },
        _count: { select: { items: true } },
      },
    });
  },

  async get(id: string) {
    const row = await prisma.internalDemand.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { displayName: true } },
        raisedForSection: { select: { code: true, name: true } },
        items: { orderBy: { id: 'asc' } },
      },
    });
    if (!row) throw new NotFoundError('InternalDemand', id);
    return row;
  },

  async create(userId: string, input: CreateDemandInput): Promise<{ id: string; demandNumber: string }> {
    const section = await prisma.section.findUnique({ where: { id: input.raisedForSectionId }, select: { id: true } });
    if (!section) throw new NotFoundError('Section', input.raisedForSectionId);

    const id = ulid();
    const demandNumber = await nextDemandNumber();
    await prisma.internalDemand.create({
      data: {
        id,
        demandNumber,
        raisedByUserId: userId,
        raisedForSectionId: input.raisedForSectionId,
        raisedOn: input.raisedOn ?? new Date(),
        notes: input.notes ?? null,
        items: {
          create: input.items.map((i) => ({
            id: ulid(),
            itemName: i.itemName,
            quantity: i.quantity,
            uom: i.uom,
            remarks: i.remarks ?? null,
          })),
        },
      },
    });
    return { id, demandNumber };
  },

  async update(id: string, input: UpdateDemandInput): Promise<void> {
    const row = await prisma.internalDemand.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalDemand', id);
    if (row.status === InternalDemandStatus.CLOSED) throw new ValidationError('Demand is closed');
    await prisma.internalDemand.update({ where: { id }, data: { notes: input.notes ?? null } });
  },

  async addItem(demandId: string, input: DemandItemInput): Promise<{ id: string }> {
    const row = await prisma.internalDemand.findUnique({ where: { id: demandId }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalDemand', demandId);
    if (row.status === InternalDemandStatus.CLOSED) throw new ValidationError('Demand is closed');
    const id = ulid();
    await prisma.internalDemandItem.create({
      data: { id, demandId, itemName: input.itemName, quantity: input.quantity, uom: input.uom, remarks: input.remarks ?? null },
    });
    return { id };
  },

  async removeItem(itemId: string): Promise<void> {
    const item = await prisma.internalDemandItem.findUnique({
      where: { id: itemId },
      select: { id: true, demand: { select: { status: true } } },
    });
    if (!item) throw new NotFoundError('InternalDemandItem', itemId);
    if (item.demand.status === InternalDemandStatus.CLOSED) throw new ValidationError('Demand is closed');
    await prisma.internalDemandItem.delete({ where: { id: itemId } });
  },

  async markIssued(id: string): Promise<void> {
    const row = await prisma.internalDemand.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalDemand', id);
    if (row.status !== InternalDemandStatus.OPEN) throw new ValidationError('Only an OPEN demand can be marked issued');
    await prisma.internalDemand.update({ where: { id }, data: { status: InternalDemandStatus.ISSUED } });
  },

  async close(id: string): Promise<void> {
    const row = await prisma.internalDemand.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalDemand', id);
    if (row.status === InternalDemandStatus.CLOSED) throw new ValidationError('Demand is already closed');
    await prisma.internalDemand.update({ where: { id }, data: { status: InternalDemandStatus.CLOSED } });
  },
};