import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  CreateInsuranceInput,
  CreateShipmentInput,
  MarkShipmentReceivedInput,
  CreateEndUserCertificateInput,
  CreateAgentCommissionInput,
  ApproveAgentCommissionInput,
} from '@/interfaces/http/schemas/executionEvidence';

/**
 * Four append-only evidence stores attached to a Contract (DPP&I-35
 * Chapters XVII–XX). The service enforces lightweight date and currency
 * invariants only — these records describe reality rather than drive a
 * state machine of their own.
 */
export const executionEvidence = {
  // --- Insurance (Ch XVII) ---------------------------------------------------
  async createInsurance(input: CreateInsuranceInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true, currency: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (input.coverToDate.getTime() <= input.coverFromDate.getTime()) {
      throw new ValidationError('coverToDate must be after coverFromDate');
    }
    if (input.currency !== contract.currency) {
      throw new ValidationError(`Insurance currency ${input.currency} must match contract currency ${contract.currency}`);
    }
    const id = ulid();
    await prisma.insurance.create({
      data: {
        id,
        contractId: input.contractId,
        kind: input.kind,
        policyNumber: input.policyNumber,
        insurer: input.insurer,
        coverFromDate: input.coverFromDate,
        coverToDate: input.coverToDate,
        premium: input.premium,
        currency: input.currency,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  // --- Shipment (Ch XVIII) ---------------------------------------------------
  async createShipment(input: CreateShipmentInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (input.invoiceId) {
      const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId }, select: { id: true, contractId: true } });
      if (!invoice) throw new NotFoundError('Invoice', input.invoiceId);
      if (invoice.contractId !== input.contractId) {
        throw new ValidationError('Invoice belongs to a different contract');
      }
    }
    if (input.receivedOn && input.receivedOn.getTime() < input.dispatchedOn.getTime()) {
      throw new ValidationError('receivedOn must be on or after dispatchedOn');
    }
    const id = ulid();
    await prisma.shipment.create({
      data: {
        id,
        contractId: input.contractId,
        invoiceId: input.invoiceId ?? null,
        mode: input.mode,
        blAwbNumber: input.blAwbNumber,
        dispatchedOn: input.dispatchedOn,
        receivedOn: input.receivedOn ?? null,
        freightForwarder: input.freightForwarder ?? null,
        originPort: input.originPort ?? null,
        destinationPort: input.destinationPort ?? null,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async markShipmentReceived(id: string, input: MarkShipmentReceivedInput): Promise<void> {
    const row = await prisma.shipment.findUnique({ where: { id }, select: { id: true, dispatchedOn: true, receivedOn: true } });
    if (!row) throw new NotFoundError('Shipment', id);
    if (row.receivedOn) throw new ValidationError('Shipment already marked received');
    if (input.receivedOn.getTime() < row.dispatchedOn.getTime()) {
      throw new ValidationError('receivedOn must be on or after dispatchedOn');
    }
    await prisma.shipment.update({ where: { id }, data: { receivedOn: input.receivedOn } });
  },

  // --- EndUserCertificate (Ch XIX) -------------------------------------------
  async createEndUserCertificate(issuingAuthorityUserId: string, input: CreateEndUserCertificateInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const id = ulid();
    await prisma.endUserCertificate.create({
      data: {
        id,
        contractId: input.contractId,
        issuedOn: input.issuedOn,
        issuingAuthorityUserId,
        endUserOrganisation: input.endUserOrganisation,
        controlledGoodsDesc: input.controlledGoodsDesc,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  // --- AgentCommission (Ch XX) -----------------------------------------------
  async createAgentCommission(input: CreateAgentCommissionInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true, currency: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (input.currency !== contract.currency) {
      throw new ValidationError(`Commission currency ${input.currency} must match contract currency ${contract.currency}`);
    }
    // DPP&I-35 Ch XX typically caps agent commission at single-digit percent;
    // we don't bake in a hard number since it varies by case — surface the
    // percent transparently and let compliance evaluate.
    const id = ulid();
    await prisma.agentCommission.create({
      data: {
        id,
        contractId: input.contractId,
        agentName: input.agentName,
        agentFirmId: input.agentFirmId ?? null,
        percent: input.percent,
        amount: input.amount,
        currency: input.currency,
        disclosedOn: input.disclosedOn,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async approveAgentCommission(id: string, approvedByUserId: string, input: ApproveAgentCommissionInput): Promise<void> {
    const row = await prisma.agentCommission.findUnique({ where: { id }, select: { id: true, approvedOn: true } });
    if (!row) throw new NotFoundError('AgentCommission', id);
    if (row.approvedOn) throw new ValidationError('Agent commission already approved');
    await prisma.agentCommission.update({
      where: { id },
      data: { approvedOn: input.approvedOn, approvedByUserId },
    });
  },
};
