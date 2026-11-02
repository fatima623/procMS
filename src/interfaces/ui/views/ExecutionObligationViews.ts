import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Read-side projections for Delivery Period extensions, Liquidated Damages,
 * Inspection reports, and Discrepancies.
 */

export interface DPExtensionRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly previousDP: string;
  readonly newDP: string;
  readonly grantedOn: string;
  readonly reason: string;
}

export async function listDPExtensions(): Promise<readonly DPExtensionRow[]> {
  const rows = await prisma.deliveryPeriodExtension.findMany({
    orderBy: { grantedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    previousDP: r.previousDP.toISOString(),
    newDP: r.newDP.toISOString(),
    grantedOn: r.grantedOn.toISOString(),
    reason: r.reason,
  }));
}

export interface LDRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly assessedOn: string;
  readonly periodFrom: string;
  readonly periodTo: string;
  readonly basis: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly waivedAmountMinor: string | null;
  readonly waivedReason: string | null;
}

export async function listLDs(): Promise<readonly LDRow[]> {
  const rows = await prisma.liquidatedDamages.findMany({
    orderBy: { assessedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    assessedOn: r.assessedOn.toISOString(),
    periodFrom: r.periodFrom.toISOString(),
    periodTo: r.periodTo.toISOString(),
    basis: r.basis,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
    waivedAmountMinor: r.waivedAmount ? decimalToMinor(r.waivedAmount).toString() : null,
    waivedReason: r.waivedReason,
  }));
}

export interface InspectionRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly performedOn: string;
  readonly verdict: string;
  readonly summary: string;
  readonly openDiscrepancies: number;
  readonly totalDiscrepancies: number;
}

export async function listInspections(): Promise<readonly InspectionRow[]> {
  const rows = await prisma.inspection.findMany({
    orderBy: { performedOn: 'desc' },
    include: {
      contract: { include: { firm: { select: { name: true } } } },
      discrepancies: { select: { status: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    performedOn: r.performedOn.toISOString(),
    verdict: r.verdict,
    summary: r.summary,
    openDiscrepancies: r.discrepancies.filter((d) => d.status === 'OPEN').length,
    totalDiscrepancies: r.discrepancies.length,
  }));
}

export interface DiscrepancyRow {
  readonly id: string;
  readonly inspectionId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly raisedOn: string;
  readonly description: string;
  readonly severity: string;
  readonly status: string;
  readonly resolvedOn: string | null;
}

export async function listDiscrepancies(): Promise<readonly DiscrepancyRow[]> {
  const rows = await prisma.discrepancy.findMany({
    orderBy: { raisedOn: 'desc' },
    include: {
      inspection: { include: { contract: { include: { firm: { select: { name: true } } } } } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    inspectionId: r.inspectionId,
    contractNumber: r.inspection.contract.contractNumber,
    firmName: r.inspection.contract.firm.name,
    raisedOn: r.raisedOn.toISOString(),
    description: r.description,
    severity: r.severity,
    status: r.status,
    resolvedOn: r.resolvedOn?.toISOString() ?? null,
  }));
}
