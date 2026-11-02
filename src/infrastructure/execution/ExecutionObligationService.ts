import { ulid } from 'ulid';
import { DiscrepancyStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import type {
  ExtendDPInput,
  AssessLDInput,
  RecordInspectionInput,
  RaiseDiscrepancyInput,
  ResolveDiscrepancyInput,
} from '@/interfaces/http/schemas/executionObligations';

/**
 * ExecutionObligationService — admin / inspectorate operations on the
 * post-award obligations: DP extensions, LD assessments, inspection reports,
 * discrepancies. All operations are single-transaction.
 */
export const executionObligations = {
  // --- Delivery Period extensions (DPP&I-35 Ch XIII) --------------------------

  async extendDP(grantedByUserId: string, input: ExtendDPInput): Promise<{ id: string; previousDP: Date | null }> {
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
      select: { id: true, originalDP: true, dpExtensions: { orderBy: { grantedOn: 'desc' }, take: 1, select: { newDP: true } } },
    });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const previousDP = contract.dpExtensions[0]?.newDP ?? contract.originalDP ?? null;
    if (previousDP && input.newDP.getTime() <= previousDP.getTime()) {
      throw new ValidationError('New DP must be after the current DP');
    }
    const id = ulid();
    await prisma.deliveryPeriodExtension.create({
      data: {
        id,
        contractId: input.contractId,
        previousDP: previousDP ?? input.newDP, // if contract has no DP yet, treat the new DP as the first baseline
        newDP: input.newDP,
        reason: input.reason,
        grantedByUserId,
        grantedOn: input.grantedOn,
        documentKey: input.documentKey ?? null,
      },
    });
    // Also seed originalDP if it was null — the first extension's previousDP becomes original.
    if (!contract.originalDP) {
      await prisma.contract.update({ where: { id: input.contractId }, data: { originalDP: previousDP ?? input.newDP } });
    }
    return { id, previousDP };
  },

  // --- Liquidated Damages (DPP&I-35 Ch XIII) ----------------------------------

  async assessLD(assessedByUserId: string, input: AssessLDInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true, value: true, currency: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (input.periodTo.getTime() < input.periodFrom.getTime()) {
      throw new ValidationError('periodTo must be on or after periodFrom');
    }
    const id = ulid();
    await prisma.liquidatedDamages.create({
      data: {
        id,
        contractId: input.contractId,
        assessedOn: input.assessedOn,
        periodFrom: input.periodFrom,
        periodTo: input.periodTo,
        basis: input.basis,
        amount: input.amount,
        currency: input.currency,
        waivedAmount: input.waivedAmount ?? null,
        waivedReason: input.waivedReason ?? null,
        assessedByUserId,
      },
    });
    return { id };
  },

  // --- Inspection (DPP&I-35 Ch XVI) -------------------------------------------

  async recordInspection(performedByUserId: string, input: RecordInspectionInput): Promise<{ id: string }> {
    const contract = await prisma.contract.findUnique({ where: { id: input.contractId }, select: { id: true } });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    const id = ulid();
    await prisma.inspection.create({
      data: {
        id,
        contractId: input.contractId,
        performedByUserId,
        performedOn: input.performedOn,
        verdict: input.verdict,
        summary: input.summary,
        documentKey: input.documentKey ?? null,
      },
    });
    return { id };
  },

  async raiseDiscrepancy(input: RaiseDiscrepancyInput): Promise<{ id: string }> {
    const inspection = await prisma.inspection.findUnique({ where: { id: input.inspectionId }, select: { id: true } });
    if (!inspection) throw new NotFoundError('Inspection', input.inspectionId);
    const id = ulid();
    await prisma.discrepancy.create({
      data: {
        id,
        inspectionId: input.inspectionId,
        raisedOn: input.raisedOn,
        description: input.description,
        severity: input.severity,
      },
    });
    return { id };
  },

  async resolveDiscrepancy(id: string, input: ResolveDiscrepancyInput): Promise<void> {
    const row = await prisma.discrepancy.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!row) throw new NotFoundError('Discrepancy', id);
    if (row.status !== DiscrepancyStatus.OPEN) throw new ValidationError(`Discrepancy ${id} is already ${row.status.toLowerCase()}`);
    await prisma.discrepancy.update({
      where: { id },
      data: {
        status: input.outcome,
        resolvedOn: input.resolvedOn,
        resolutionNotes: input.resolutionNotes,
      },
    });
  },

  /**
   * Policy helper: a Contract's Taking-Over Certificate should not be issued
   * while any Inspection on it has OPEN discrepancies. Throws if that's the case.
   * (Not yet wired into a Contract use-case; call from the UI/handler layer.)
   */
  async assertNoOpenDiscrepancies(contractId: string): Promise<void> {
    const open = await prisma.discrepancy.count({
      where: { inspection: { contractId }, status: DiscrepancyStatus.OPEN },
    });
    if (open > 0) {
      throw new ValidationError(`Cannot issue Taking-Over: ${open} discrepancy row(s) still OPEN on this contract`);
    }
  },
};
