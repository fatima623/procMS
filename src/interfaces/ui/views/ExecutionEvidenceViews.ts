import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

export interface InsuranceRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly kind: string;
  readonly policyNumber: string;
  readonly insurer: string;
  readonly coverFromDate: string;
  readonly coverToDate: string;
  readonly premiumMinor: string;
  readonly currency: string;
}

export async function listInsurances(): Promise<readonly InsuranceRow[]> {
  const rows = await prisma.insurance.findMany({
    orderBy: { coverFromDate: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    kind: r.kind,
    policyNumber: r.policyNumber,
    insurer: r.insurer,
    coverFromDate: r.coverFromDate.toISOString(),
    coverToDate: r.coverToDate.toISOString(),
    premiumMinor: decimalToMinor(r.premium).toString(),
    currency: r.currency,
  }));
}

export interface ShipmentRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly mode: string;
  readonly blAwbNumber: string;
  readonly dispatchedOn: string;
  readonly receivedOn: string | null;
  readonly freightForwarder: string | null;
  readonly originPort: string | null;
  readonly destinationPort: string | null;
}

export async function listShipments(): Promise<readonly ShipmentRow[]> {
  const rows = await prisma.shipment.findMany({
    orderBy: { dispatchedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 300,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    mode: r.mode,
    blAwbNumber: r.blAwbNumber,
    dispatchedOn: r.dispatchedOn.toISOString(),
    receivedOn: r.receivedOn?.toISOString() ?? null,
    freightForwarder: r.freightForwarder,
    originPort: r.originPort,
    destinationPort: r.destinationPort,
  }));
}

export interface EndUserCertificateRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly issuedOn: string;
  readonly endUserOrganisation: string;
  readonly controlledGoodsDesc: string;
}

export async function listEndUserCertificates(): Promise<readonly EndUserCertificateRow[]> {
  const rows = await prisma.endUserCertificate.findMany({
    orderBy: { issuedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    issuedOn: r.issuedOn.toISOString(),
    endUserOrganisation: r.endUserOrganisation,
    controlledGoodsDesc: r.controlledGoodsDesc,
  }));
}

export interface AgentCommissionRow {
  readonly id: string;
  readonly contractId: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly agentName: string;
  readonly percent: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly disclosedOn: string;
  readonly approvedOn: string | null;
}

export async function listAgentCommissions(): Promise<readonly AgentCommissionRow[]> {
  const rows = await prisma.agentCommission.findMany({
    orderBy: { disclosedOn: 'desc' },
    include: { contract: { include: { firm: { select: { name: true } } } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    contractId: r.contractId,
    contractNumber: r.contract.contractNumber,
    firmName: r.contract.firm.name,
    agentName: r.agentName,
    percent: r.percent.toString(),
    amountMinor: decimalToMinor(r.amount).toString(),
    currency: r.currency,
    disclosedOn: r.disclosedOn.toISOString(),
    approvedOn: r.approvedOn?.toISOString() ?? null,
  }));
}
