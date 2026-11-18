import { ulid } from 'ulid';
import { VehicleRequisitionStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateVehicleRequisitionInput,
  DecideVehicleRequisitionInput,
} from '@/interfaces/http/schemas/transport';

async function nextRequisitionNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VR/${year}/`;
  const count = await prisma.vehicleRequisition.count({
    where: { requisitionNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

export const vehicleRequisitionService = {
  async list(filter?: { status?: VehicleRequisitionStatus }) {
    return prisma.vehicleRequisition.findMany({
      where: filter?.status ? { status: filter.status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { select: { displayName: true } },
        approvedBy: { select: { displayName: true } },
      },
    });
  },

  async get(id: string) {
    const row = await prisma.vehicleRequisition.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { displayName: true } },
        approvedBy: { select: { displayName: true } },
      },
    });
    if (!row) throw new NotFoundError('VehicleRequisition', id);
    return row;
  },

  async create(userId: string, input: CreateVehicleRequisitionInput): Promise<{ id: string; requisitionNumber: string }> {
    const id = ulid();
    const requisitionNumber = await nextRequisitionNumber();
    await prisma.vehicleRequisition.create({
      data: {
        id,
        requisitionNumber,
        raisedByUserId: userId,
        purpose: input.purpose,
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        requiredFrom: input.requiredFrom,
        requiredTo: input.requiredTo,
        passengerCount: input.passengerCount,
        status: VehicleRequisitionStatus.PENDING,
        remarks: input.remarks ?? null,
      },
    });
    return { id, requisitionNumber };
  },

  async decide(id: string, approverUserId: string, input: DecideVehicleRequisitionInput): Promise<void> {
    const row = await prisma.vehicleRequisition.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('VehicleRequisition', id);
    if (row.status !== VehicleRequisitionStatus.PENDING) {
      throw new ValidationError('Only PENDING requisitions can be decided');
    }

    const nextStatus = input.decision === 'APPROVE'
      ? VehicleRequisitionStatus.APPROVED
      : VehicleRequisitionStatus.REJECTED;

    await prisma.vehicleRequisition.update({
      where: { id },
      data: {
        status: nextStatus,
        approvedByUserId: approverUserId,
        decidedOn: new Date(),
        assignedVehicleRef: input.assignedVehicleRef ?? null,
        remarks: input.remarks ?? null,
      },
    });
  },

  async markCompleted(id: string): Promise<void> {
    const row = await prisma.vehicleRequisition.findUnique({ where: { id }, select: { status: true } });
    if (!row) throw new NotFoundError('VehicleRequisition', id);
    if (row.status !== VehicleRequisitionStatus.APPROVED) {
      throw new ValidationError('Only APPROVED requisitions can be marked completed');
    }

    await prisma.vehicleRequisition.update({
      where: { id },
      data: { status: VehicleRequisitionStatus.COMPLETED },
    });
  },
};
