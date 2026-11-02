import { ulid } from 'ulid';
import {
  RiskPurchaseStatus,
  FrameworkAgreementStatus,
  CallOffStatus as DbCallOffStatus,
} from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  OpenRiskPurchaseInput,
  LinkReplacementInput,
  SettleRiskPurchaseInput,
  CloseRiskPurchaseInput,
  CreateFrameworkInput,
  ActivateFrameworkInput,
  TerminateFrameworkInput,
  CreateCallOffInput,
  FulfillCallOffInput,
  CancelCallOffInput,
} from '@/interfaces/http/schemas/frameworks';

/**
 * Risk purchase (DPP&I-35 Ch XXII) + Framework agreement / Call-off order
 * (DPP&I-35 Ch XXIII, PPRA Rule 16A) services.
 */
export const riskPurchaseService = {
  async open(initiatedByUserId: string, input: OpenRiskPurchaseInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.originalContractId }, select: { id: true, status: true } });
    if (!contract) throw new NotFoundError('Contract', input.originalContractId);
    const existing = await prisma.riskPurchaseCase.findUnique({ where: { originalContractId: input.originalContractId }, select: { id: true } });
    if (existing) throw new ValidationError('A risk-purchase case already exists for this contract');
    const id = ulid();
    await prisma.riskPurchaseCase.create({
      data: {
        id,
        originalContractId: input.originalContractId,
        triggerReason: input.triggerReason,
        initiatedOn: input.initiatedOn,
        initiatedByUserId,
        notes: input.notes ?? null,
      },
    });
    return { id };
  },

  async linkReplacement(id: string, input: LinkReplacementInput): Promise<void> {
    const row = await prisma.riskPurchaseCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('RiskPurchaseCase', id);
    if (row.status === RiskPurchaseStatus.CLOSED) throw new ValidationError('Case is closed');
    if (input.replacementIndentId) {
      const i = await prisma.indent.findUnique({ where: { id: input.replacementIndentId }, select: { id: true } });
      if (!i) throw new NotFoundError('Indent', input.replacementIndentId);
    }
    if (input.replacementContractId) {
      const c = await prisma.contract.findUnique({ where: { id: input.replacementContractId }, select: { id: true } });
      if (!c) throw new NotFoundError('Contract', input.replacementContractId);
    }
    const nextStatus = input.replacementContractId ? RiskPurchaseStatus.REPLACEMENT_AWARDED : RiskPurchaseStatus.INITIATED;
    await prisma.riskPurchaseCase.update({
      where: { id },
      data: {
        replacementIndentId: input.replacementIndentId ?? undefined,
        replacementContractId: input.replacementContractId ?? undefined,
        status: nextStatus,
      },
    });
  },

  async settle(id: string, input: SettleRiskPurchaseInput): Promise<void> {
    const row = await prisma.riskPurchaseCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('RiskPurchaseCase', id);
    if (row.status === RiskPurchaseStatus.CLOSED) throw new ValidationError('Case is closed');
    await prisma.riskPurchaseCase.update({
      where: { id },
      data: {
        riskSettled: input.riskSettled,
        currency: input.currency,
        settledOn: input.settledOn,
        status: RiskPurchaseStatus.SETTLED,
      },
    });
  },

  async close(id: string, input: CloseRiskPurchaseInput): Promise<void> {
    const row = await prisma.riskPurchaseCase.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('RiskPurchaseCase', id);
    if (row.status === RiskPurchaseStatus.CLOSED) throw new ValidationError('Case is already closed');
    await prisma.riskPurchaseCase.update({
      where: { id },
      data: { status: RiskPurchaseStatus.CLOSED, closedOn: input.closedOn },
    });
  },
};

export const frameworkService = {
  async create(input: CreateFrameworkInput): Promise<{ id: string }> {
    if (input.validTo.getTime() <= input.validFrom.getTime()) {
      throw new ValidationError('validTo must be after validFrom');
    }
    // Dedupe firm ids
    const firmIds = Array.from(new Set(input.firmIds));
    const firms = await prisma.firm.findMany({ where: { id: { in: firmIds } }, select: { id: true } });
    if (firms.length !== firmIds.length) {
      throw new NotFoundError('Firm', firmIds.find((fid) => !firms.some((f) => f.id === fid)) ?? '?');
    }
    const existing = await prisma.frameworkAgreement.findUnique({ where: { reference: input.reference }, select: { id: true } });
    if (existing) throw new ValidationError(`Reference ${input.reference} is already in use`);
    const id = ulid();
    await prisma.frameworkAgreement.create({
      data: {
        id,
        reference: input.reference,
        kind: input.kind,
        name: input.name,
        category: input.category,
        validFrom: input.validFrom,
        validTo: input.validTo,
        maxValue: input.maxValue ?? null,
        currency: input.currency,
        documentKey: input.documentKey ?? null,
        firms: { create: firmIds.map((fid) => ({ id: ulid(), firmId: fid })) },
      },
    });
    return { id };
  },

  async activate(id: string, signedByUserId: string, input: ActivateFrameworkInput): Promise<void> {
    const row = await prisma.frameworkAgreement.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FrameworkAgreement', id);
    if (row.status !== FrameworkAgreementStatus.DRAFT) throw new ValidationError(`Framework is already ${row.status}`);
    await prisma.frameworkAgreement.update({
      where: { id },
      data: { status: FrameworkAgreementStatus.ACTIVE, signedByUserId, signedOn: input.signedOn },
    });
  },

  async terminate(id: string, input: TerminateFrameworkInput): Promise<void> {
    const row = await prisma.frameworkAgreement.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('FrameworkAgreement', id);
    if (row.status === FrameworkAgreementStatus.TERMINATED) throw new ValidationError('Already terminated');
    await prisma.frameworkAgreement.update({
      where: { id },
      data: { status: FrameworkAgreementStatus.TERMINATED, terminatedOn: input.terminatedOn, terminatedReason: input.terminatedReason },
    });
  },

  async placeCallOff(input: CreateCallOffInput): Promise<{ id: string }> {
    const fw = await prisma.frameworkAgreement.findUnique({
      where: { id: input.frameworkAgreementId },
      select: { id: true, status: true, currency: true, firms: { select: { firmId: true } } },
    });
    if (!fw) throw new NotFoundError('FrameworkAgreement', input.frameworkAgreementId);
    if (fw.status !== FrameworkAgreementStatus.ACTIVE) {
      throw new ValidationError(`Framework must be ACTIVE to place a call-off (currently ${fw.status})`);
    }
    if (!fw.firms.some((f) => f.firmId === input.firmId)) {
      throw new ValidationError(`Firm ${input.firmId} is not on framework ${input.frameworkAgreementId}`);
    }
    if (input.currency !== fw.currency) {
      throw new ValidationError(`Call-off currency ${input.currency} must match framework currency ${fw.currency}`);
    }
    const existing = await prisma.callOffOrder.findUnique({ where: { callOffNumber: input.callOffNumber }, select: { id: true } });
    if (existing) throw new ValidationError(`Call-off number ${input.callOffNumber} is already in use`);
    const id = ulid();
    await prisma.callOffOrder.create({
      data: {
        id,
        frameworkAgreementId: input.frameworkAgreementId,
        firmId: input.firmId,
        callOffNumber: input.callOffNumber,
        description: input.description,
        amount: input.amount,
        currency: input.currency,
        placedOn: input.placedOn,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async fulfillCallOff(id: string, input: FulfillCallOffInput): Promise<void> {
    const row = await prisma.callOffOrder.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('CallOffOrder', id);
    if (row.status !== DbCallOffStatus.PLACED) throw new ValidationError(`Call-off is ${row.status}`);
    await prisma.callOffOrder.update({ where: { id }, data: { status: DbCallOffStatus.FULFILLED, fulfilledOn: input.fulfilledOn } });
  },

  async cancelCallOff(id: string, input: CancelCallOffInput): Promise<void> {
    const row = await prisma.callOffOrder.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('CallOffOrder', id);
    if (row.status === DbCallOffStatus.FULFILLED) throw new ValidationError('Cannot cancel a fulfilled call-off');
    if (row.status === DbCallOffStatus.CANCELLED) throw new ValidationError('Call-off is already cancelled');
    await prisma.callOffOrder.update({
      where: { id },
      data: { status: DbCallOffStatus.CANCELLED, cancelledOn: input.cancelledOn, cancelledReason: input.cancelledReason },
    });
  },
};
