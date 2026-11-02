import { ulid } from 'ulid';
import { ContractAmendmentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  ProposeContractAmendmentInput,
  ApproveContractAmendmentInput,
  RejectContractAmendmentInput,
} from '@/interfaces/http/schemas/governance';

/**
 * ContractAmendment lifecycle: PROPOSED → APPROVED | REJECTED. When an
 * amendment with a non-null deltaValue is APPROVED, the parent Contract's
 * `value` moves by that delta (same transaction) and the row's status
 * flips. A DP-scope amendment is informational — the real DP change lives
 * in DeliveryPeriodExtension.
 */
export const contractAmendmentService = {
  async propose(input: ProposeContractAmendmentInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true, currency: true, status: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (contract.status === 'CLOSED' || contract.status === 'TERMINATED') {
      throw new ValidationError(`Cannot amend a ${contract.status} contract`);
    }
    if (input.deltaValue && !input.deltaCurrency) {
      throw new ValidationError('deltaCurrency is required when deltaValue is set');
    }
    if (input.deltaCurrency && input.deltaCurrency !== contract.currency) {
      throw new ValidationError(`deltaCurrency ${input.deltaCurrency} must match contract currency ${contract.currency}`);
    }
    const id = ulid();
    await prisma.contractAmendment.create({
      data: {
        id,
        contractId: input.contractId,
        scope: input.scope,
        summary: input.summary,
        deltaValue: input.deltaValue ?? null,
        deltaCurrency: input.deltaCurrency ?? null,
        requestedOn: input.requestedOn,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async approve(id: string, approvedByUserId: string, input: ApproveContractAmendmentInput): Promise<void> {
    const row = await prisma.contractAmendment.findUnique({
      where: { id },
      select: { id: true, status: true, contractId: true, deltaValue: true, scope: true },
    });
    if (!row) throw new NotFoundError('ContractAmendment', id);
    if (row.status !== ContractAmendmentStatus.PROPOSED) {
      throw new ValidationError(`Amendment ${id} is already ${row.status.toLowerCase()}`);
    }
    await prisma.$transaction(async (tx) => {
      await tx.contractAmendment.update({
        where: { id },
        data: { status: ContractAmendmentStatus.APPROVED, approvedOn: input.approvedOn, approvedByUserId },
      });
      // Only VALUE and QTY amendments move the contract value; QTY needs
      // deltaValue populated by the proposer. SPEC / DP / OTHER are informational.
      if ((row.scope === 'VALUE' || row.scope === 'QTY') && row.deltaValue) {
        await tx.contract.update({
          where: { id: row.contractId },
          data: { value: { increment: row.deltaValue } },
        });
      }
    });
  },

  async reject(id: string, _rejectedByUserId: string, input: RejectContractAmendmentInput): Promise<void> {
    const row = await prisma.contractAmendment.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('ContractAmendment', id);
    if (row.status !== ContractAmendmentStatus.PROPOSED) {
      throw new ValidationError(`Amendment ${id} is already ${row.status.toLowerCase()}`);
    }
    await prisma.contractAmendment.update({
      where: { id },
      data: { status: ContractAmendmentStatus.REJECTED, rejectionReason: input.rejectionReason },
    });
  },
};
