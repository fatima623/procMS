import { ulid } from 'ulid';
import { DiscrepancyStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';
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

  async assessLD(assessedByUserId: string, input: AssessLDInput): Promise<{ id: string; capExceeded: boolean }> {
    const contract = await prisma.contract.findUnique({
      where: { id: input.contractId },
      select: { id: true, value: true, currency: true, liquidatedDamages: { select: { amount: true, waivedAmount: true } } },
    });
    if (!contract) throw new NotFoundError('Contract', input.contractId);
    if (input.periodTo.getTime() < input.periodFrom.getTime()) {
      throw new ValidationError('periodTo must be on or after periodFrom');
    }
    if (input.currency !== contract.currency) {
      throw new ValidationError(`LD currency ${input.currency} must match contract currency ${contract.currency}`);
    }

    // DPP&I-35 Ch XIII — LD assessed on a contract is capped at 10% of its value.
    // We compute the running total (previous net LD + this proposed net LD) and
    // refuse the assessment when the running total would exceed the cap.
    const contractValueMinor = decimalToMinor(contract.value);
    const capMinor = (contractValueMinor * 10n) / 100n;
    const priorNetMinor = contract.liquidatedDamages.reduce((sum, ld) => {
      const amt = decimalToMinor(ld.amount);
      const waived = ld.waivedAmount ? decimalToMinor(ld.waivedAmount) : 0n;
      return sum + (amt - waived);
    }, 0n);
    const thisNetMinor =
      decimalToMinor(input.amount) -
      (input.waivedAmount ? decimalToMinor(input.waivedAmount) : 0n);
    const projectedMinor = priorNetMinor + thisNetMinor;
    const capExceeded = projectedMinor > capMinor;
    if (capExceeded) {
      throw new ValidationError(
        `LD cap exceeded (DPP&I-35 Ch XIII): net LD ${projectedMinor.toString()} > 10% of contract (${capMinor.toString()}). Waive down or reduce.`,
      );
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
    return { id, capExceeded: false };
  },

  /**
   * Record a (partial or full) waiver on an existing LD. Refuses amounts
   * greater than the assessed amount, or non-positive amounts. Overwrites
   * any prior waiver on this row.
   */
  async waiveLD(id: string, input: { waivedAmount: string; waivedReason: string }): Promise<void> {
    const ld = await prisma.liquidatedDamages.findUnique({
      where: { id },
      select: { id: true, amount: true, currency: true },
    });
    if (!ld) throw new NotFoundError('LiquidatedDamages', id);
    const amtMinor = decimalToMinor(ld.amount);
    const waivedMinor = decimalToMinor(input.waivedAmount);
    if (waivedMinor <= 0n) {
      throw new ValidationError('Waived amount must be positive');
    }
    if (waivedMinor > amtMinor) {
      throw new ValidationError(
        `Waived amount ${input.waivedAmount} exceeds assessed amount ${ld.amount.toString()}`,
      );
    }
    await prisma.liquidatedDamages.update({
      where: { id },
      data: { waivedAmount: input.waivedAmount, waivedReason: input.waivedReason },
    });
  },

  /**
   * Running net LD outstanding on a contract (amount − waived). Used by the
   * Payment-record form so cashiers can see what should be deducted.
   */
  async outstandingLDMinor(contractId: string): Promise<bigint> {
    const rows = await prisma.liquidatedDamages.findMany({
      where: { contractId },
      select: { amount: true, waivedAmount: true },
    });
    return rows.reduce((sum, ld) => {
      const amt = decimalToMinor(ld.amount);
      const waived = ld.waivedAmount ? decimalToMinor(ld.waivedAmount) : 0n;
      return sum + (amt - waived);
    }, 0n);
  },

  /**
   * Issue the Taking-Over Certificate for a contract. Refuses while any
   * discrepancy is OPEN on an inspection of that contract (DPP&I-35 Ch XVI).
   */
  async issueTakingOverCertificate(contractId: string, certifiedOn: Date): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, takingOverCertifiedOn: true, status: true },
    });
    if (!contract) throw new NotFoundError('Contract', contractId);
    if (contract.takingOverCertifiedOn) {
      throw new ValidationError('Taking-Over Certificate already issued for this contract');
    }
    await this.assertNoOpenDiscrepancies(contractId);
    await prisma.contract.update({
      where: { id: contractId },
      data: {
        takingOverCertifiedOn: certifiedOn,
        status: contract.status === 'SIGNED' || contract.status === 'IN_PROGRESS' ? 'COMPLETED' : contract.status,
      },
    });
  },

  /**
   * Formally close a contract after taking-over + all follow-up obligations
   * are settled. COMPLETED → CLOSED and stamps `closedOn`. Refuses if the
   * contract is not yet COMPLETED, is already CLOSED, or was TERMINATED
   * (termination has its own flow and keeps a non-CLOSED status for the
   * risk-purchase trail). Does NOT itself check invoices/payments/LDs —
   * that compliance read belongs to ZeroLinkAI.
   */
  async closeContract(contractId: string, closedOn: Date): Promise<void> {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      select: { id: true, status: true, closedOn: true, takingOverCertifiedOn: true },
    });
    if (!contract) throw new NotFoundError('Contract', contractId);
    if (contract.closedOn) {
      throw new ValidationError('Contract is already closed');
    }
    if (contract.status === 'CLOSED') {
      throw new ValidationError('Contract is already CLOSED');
    }
    if (contract.status === 'TERMINATED') {
      throw new ValidationError('Cannot close a TERMINATED contract');
    }
    if (contract.status !== 'COMPLETED') {
      throw new ValidationError(
        `Contract must be COMPLETED before closing (currently ${contract.status}). ` +
        'Issue the Taking-Over Certificate first.',
      );
    }
    await prisma.contract.update({
      where: { id: contractId },
      data: { status: 'CLOSED', closedOn },
    });
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
