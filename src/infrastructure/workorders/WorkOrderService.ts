import { ulid } from 'ulid';
import { WorkOrderStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateWorkOrderInput,
  UpdateWorkOrderStatusInput,
} from '@/interfaces/http/schemas/workOrder';

async function nextWorkOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WO/${year}/`;
  const count = await prisma.workOrder.count({
    where: { workOrderNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

export const workOrderService = {
  async list(filter?: { status?: WorkOrderStatus }) {
    return prisma.workOrder.findMany({
      where: filter?.status ? { status: filter.status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { select: { displayName: true } },
      },
    });
  },

  async get(id: string) {
    const row = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { displayName: true } },
      },
    });
    if (!row) throw new NotFoundError('WorkOrder', id);
    return row;
  },

  async create(userId: string, input: CreateWorkOrderInput): Promise<{ id: string; workOrderNumber: string }> {
    const id = ulid();
    const workOrderNumber = await nextWorkOrderNumber();
    await prisma.workOrder.create({
      data: {
        id,
        workOrderNumber,
        kind: input.kind,
        subject: input.subject,
        raisedOn: new Date(),
        raisedByUserId: userId,
        assignedTo: input.assignedTo ?? null,
        status: WorkOrderStatus.OPEN,
        notes: input.notes ?? null,
      },
    });
    return { id, workOrderNumber };
  },

  async updateStatus(id: string, input: UpdateWorkOrderStatusInput): Promise<void> {
    const row = await prisma.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('WorkOrder', id);
    if (row.status === WorkOrderStatus.COMPLETED || row.status === WorkOrderStatus.CANCELLED) {
      throw new ValidationError('Completed or cancelled work orders cannot be modified');
    }

    await prisma.workOrder.update({
      where: { id },
      data: {
        status: input.status,
        assignedTo: input.assignedTo !== undefined ? input.assignedTo : undefined,
        costMinor: input.costMinor !== undefined ? input.costMinor : undefined,
        currency: input.currency ?? 'PKR',
        completedOn: input.status === WorkOrderStatus.COMPLETED ? new Date() : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });
  },
};
