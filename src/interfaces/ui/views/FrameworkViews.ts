import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

// --- Risk purchase ------------------------------------------------------------

export interface RiskPurchaseRow {
  readonly id: string;
  readonly originalContractId: string;
  readonly originalContractNumber: string;
  readonly replacementIndentId: string | null;
  readonly replacementContractId: string | null;
  readonly replacementContractNumber: string | null;
  readonly triggerReason: string;
  readonly initiatedOn: string;
  readonly status: string;
  readonly riskSettledMinor: string | null;
  readonly currency: string;
  readonly settledOn: string | null;
  readonly closedOn: string | null;
}

export async function listRiskPurchases(): Promise<readonly RiskPurchaseRow[]> {
  const rows = await prisma.riskPurchaseCase.findMany({ orderBy: { initiatedOn: 'desc' }, take: 200 });
  const originalIds = Array.from(new Set(rows.map((r) => r.originalContractId)));
  const replacementIds = rows.map((r) => r.replacementContractId).filter((x): x is string => !!x);
  const allContractIds = Array.from(new Set([...originalIds, ...replacementIds]));
  const contracts = allContractIds.length > 0
    ? await prisma.contract.findMany({ where: { id: { in: allContractIds } }, select: { id: true, contractNumber: true } })
    : [];
  const map = new Map(contracts.map((c) => [c.id, c.contractNumber]));
  return rows.map((r) => ({
    id: r.id,
    originalContractId: r.originalContractId,
    originalContractNumber: map.get(r.originalContractId) ?? r.originalContractId,
    replacementIndentId: r.replacementIndentId,
    replacementContractId: r.replacementContractId,
    replacementContractNumber: r.replacementContractId ? (map.get(r.replacementContractId) ?? r.replacementContractId) : null,
    triggerReason: r.triggerReason,
    initiatedOn: r.initiatedOn.toISOString(),
    status: r.status,
    riskSettledMinor: r.riskSettled ? decimalToMinor(r.riskSettled).toString() : null,
    currency: r.currency,
    settledOn: r.settledOn?.toISOString() ?? null,
    closedOn: r.closedOn?.toISOString() ?? null,
  }));
}

// --- Framework agreements ----------------------------------------------------

export interface FrameworkRow {
  readonly id: string;
  readonly reference: string;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly status: string;
  readonly validFrom: string;
  readonly validTo: string;
  readonly maxValueMinor: string | null;
  readonly currency: string;
  readonly firmCount: number;
  readonly callOffCount: number;
}

export async function listFrameworks(): Promise<readonly FrameworkRow[]> {
  const rows = await prisma.frameworkAgreement.findMany({
    orderBy: { validFrom: 'desc' },
    include: {
      _count: { select: { firms: true, callOffs: true } },
    },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    name: r.name,
    kind: r.kind,
    category: r.category,
    status: r.status,
    validFrom: r.validFrom.toISOString(),
    validTo: r.validTo.toISOString(),
    maxValueMinor: r.maxValue ? decimalToMinor(r.maxValue).toString() : null,
    currency: r.currency,
    firmCount: r._count.firms,
    callOffCount: r._count.callOffs,
  }));
}

export interface CallOffRow {
  readonly id: string;
  readonly frameworkId: string;
  readonly frameworkReference: string;
  readonly firmName: string;
  readonly callOffNumber: string;
  readonly description: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly placedOn: string;
  readonly fulfilledOn: string | null;
  readonly status: string;
}

export async function listCallOffs(): Promise<readonly CallOffRow[]> {
  const rows = await prisma.callOffOrder.findMany({
    orderBy: { placedOn: 'desc' },
    include: { framework: { select: { reference: true } } },
    take: 300,
  });
  const firmIds = Array.from(new Set(rows.map((r) => r.firmId)));
  const firms = firmIds.length > 0
    ? await prisma.firm.findMany({ where: { id: { in: firmIds } }, select: { id: true, name: true } })
    : [];
  const firmMap = new Map(firms.map((f) => [f.id, f.name]));
  return rows.map((r) => ({
    id: r.id,
    frameworkId: r.frameworkAgreementId,
    frameworkReference: r.framework.reference,
    firmName: firmMap.get(r.firmId) ?? r.firmId,
    callOffNumber: r.callOffNumber,
    description: r.description,
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
    placedOn: r.placedOn.toISOString(),
    fulfilledOn: r.fulfilledOn?.toISOString() ?? null,
    status: r.status,
  }));
}
