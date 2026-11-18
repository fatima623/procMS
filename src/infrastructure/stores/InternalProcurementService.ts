import { ulid } from 'ulid';
import { InternalProcurementStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateInternalProcurementInput,
  EnterQuotationInput,
  CreateSupplyOrderInput,
  CreateSanctionCertInput,
  CreateDebitableVoucherInput,
  CreateContingentBillInput,
} from '@/interfaces/http/schemas/internalProcurement';

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IPROC/${year}/`;
  const count = await prisma.internalProcurement.count({
    where: { reference: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(6, '0')}`;
}

export const internalProcurementService = {
  async list(filter?: { status?: InternalProcurementStatus }) {
    return prisma.internalProcurement.findMany({
      where: filter?.status ? { status: filter.status } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: { select: { displayName: true } },
        _count: { select: { items: true, invitedFirms: true, quotations: true, contingentBills: true } },
        supplyOrder: { include: { firm: { select: { name: true, code: true } } } },
      },
    });
  },

  async get(id: string) {
    const row = await prisma.internalProcurement.findUnique({
      where: { id },
      include: {
        raisedBy: { select: { displayName: true } },
        items: true,
        invitedFirms: { include: { firm: { select: { id: true, code: true, name: true } } } },
        quotations: {
          include: {
            firm: { select: { id: true, code: true, name: true } },
            item: { select: { id: true, itemName: true } },
          },
        },
        supplyOrder: { include: { firm: { select: { id: true, code: true, name: true } } } },
        sanctionCertificate: true,
        debitableVoucher: true,
        contingentBills: { include: { firm: { select: { id: true, code: true, name: true } } } },
      },
    });
    if (!row) throw new NotFoundError('InternalProcurement', id);
    return row;
  },

  async create(userId: string, input: CreateInternalProcurementInput): Promise<{ id: string; reference: string }> {
    const id = ulid();
    const reference = await nextReference();
    await prisma.internalProcurement.create({
      data: {
        id,
        reference,
        raisedOn: new Date(),
        raisedByUserId: userId,
        status: InternalProcurementStatus.DRAFT,
        notes: input.notes ?? null,
        items: {
          create: input.items.map((i) => ({
            id: ulid(),
            itemName: i.itemName,
            quantity: i.quantity,
            uom: i.uom,
          })),
        },
      },
    });
    return { id, reference };
  },

  async inviteFirm(procurementId: string, firmId: string): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);
    if (row.status === InternalProcurementStatus.CLOSED || row.status === InternalProcurementStatus.CANCELLED) {
      throw new ValidationError('Cannot invite firms to a closed or cancelled procurement');
    }
    const firm = await prisma.firm.findUnique({ where: { id: firmId }, select: { id: true } });
    if (!firm) throw new NotFoundError('Firm', firmId);

    const id = ulid();
    await prisma.internalProcurementInvitedFirm.upsert({
      where: { procurementId_firmId: { procurementId, firmId } },
      create: { id, procurementId, firmId },
      update: {},
    });
    return { id };
  },

  async enterQuotation(procurementId: string, input: EnterQuotationInput): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);
    if (row.status === InternalProcurementStatus.CLOSED || row.status === InternalProcurementStatus.CANCELLED) {
      throw new ValidationError('Cannot add quotation to a closed or cancelled procurement');
    }

    const id = ulid();
    await prisma.internalProcurementQuotation.create({
      data: {
        id,
        procurementId,
        firmId: input.firmId,
        itemId: input.itemId,
        quotedPriceMinor: input.quotedPriceMinor,
        currency: input.currency ?? 'PKR',
      },
    });

    if (row.status === InternalProcurementStatus.DRAFT) {
      await prisma.internalProcurement.update({
        where: { id: procurementId },
        data: { status: InternalProcurementStatus.QUOTED },
      });
    }
    return { id };
  },

  async placeSupplyOrder(procurementId: string, input: CreateSupplyOrderInput): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);

    const id = ulid();
    await prisma.supplyOrder.upsert({
      where: { procurementId },
      create: {
        id,
        procurementId,
        firmId: input.firmId,
        orderedOn: input.orderedOn ?? new Date(),
        totalValueMinor: input.totalValueMinor,
        currency: input.currency ?? 'PKR',
        documentKey: input.documentKey ?? null,
      },
      update: {
        firmId: input.firmId,
        orderedOn: input.orderedOn ?? new Date(),
        totalValueMinor: input.totalValueMinor,
        currency: input.currency ?? 'PKR',
        documentKey: input.documentKey ?? null,
      },
    });

    await prisma.internalProcurement.update({
      where: { id: procurementId },
      data: { status: InternalProcurementStatus.ORDERED },
    });
    return { id };
  },

  async recordSanctionCert(procurementId: string, input: CreateSanctionCertInput): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { id: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);

    const id = ulid();
    await prisma.sanctionCertificate.upsert({
      where: { procurementId },
      create: {
        id,
        procurementId,
        certificateNumber: input.certificateNumber,
        issuedOn: input.issuedOn ?? new Date(),
        authority: input.authority,
        documentKey: input.documentKey ?? null,
      },
      update: {
        certificateNumber: input.certificateNumber,
        issuedOn: input.issuedOn ?? new Date(),
        authority: input.authority,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async recordDebitableVoucher(procurementId: string, input: CreateDebitableVoucherInput): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { id: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);

    const id = ulid();
    await prisma.debitableVoucher.upsert({
      where: { procurementId },
      create: {
        id,
        procurementId,
        voucherNumber: input.voucherNumber,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'PKR',
        issuedOn: input.issuedOn ?? new Date(),
      },
      update: {
        voucherNumber: input.voucherNumber,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'PKR',
        issuedOn: input.issuedOn ?? new Date(),
      },
    });
    return { id };
  },

  async recordContingentBill(procurementId: string, input: CreateContingentBillInput): Promise<{ id: string }> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { id: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);

    const id = ulid();
    await prisma.contingentBill.create({
      data: {
        id,
        procurementId,
        firmId: input.firmId,
        billNumber: input.billNumber,
        amountMinor: input.amountMinor,
        currency: input.currency ?? 'PKR',
        submittedOn: input.submittedOn ?? new Date(),
        paidOn: input.paidOn ?? null,
      },
    });
    return { id };
  },

  async close(procurementId: string): Promise<void> {
    const row = await prisma.internalProcurement.findUnique({ where: { id: procurementId }, select: { status: true } });
    if (!row) throw new NotFoundError('InternalProcurement', procurementId);
    await prisma.internalProcurement.update({
      where: { id: procurementId },
      data: { status: InternalProcurementStatus.CLOSED },
    });
  },
};
