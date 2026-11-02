import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

// --- FMS ----------------------------------------------------------------------

export interface FMSRow {
  readonly id: string;
  readonly caseNumber: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly foreignAuthority: string;
  readonly status: string;
  readonly lorSubmittedOn: string | null;
  readonly loaReceivedOn: string | null;
  readonly loaAcceptedOn: string | null;
  readonly loaValueMinor: string | null;
  readonly currency: string;
  readonly deliveryExpectedBy: string | null;
  readonly deliveryCompletedOn: string | null;
  readonly closedOn: string | null;
}

export async function listFMSCases(): Promise<readonly FMSRow[]> {
  const rows = await prisma.fMSCase.findMany({
    orderBy: { createdAt: 'desc' },
    include: { /* indent is linked by indentId; look up subject */ },
    take: 200,
  });
  const indentIds = rows.map((r) => r.indentId);
  const indents = indentIds.length > 0
    ? await prisma.indent.findMany({ where: { id: { in: indentIds } }, select: { id: true, subject: true } })
    : [];
  const subject = new Map(indents.map((i) => [i.id, i.subject]));
  return rows.map((r) => ({
    id: r.id,
    caseNumber: r.caseNumber,
    indentId: r.indentId,
    indentSubject: subject.get(r.indentId) ?? r.indentId,
    foreignAuthority: r.foreignAuthority,
    status: r.status,
    lorSubmittedOn: r.lorSubmittedOn?.toISOString() ?? null,
    loaReceivedOn: r.loaReceivedOn?.toISOString() ?? null,
    loaAcceptedOn: r.loaAcceptedOn?.toISOString() ?? null,
    loaValueMinor: r.loaValue ? decimalToMinor(r.loaValue).toString() : null,
    currency: r.currency,
    deliveryExpectedBy: r.deliveryExpectedBy?.toISOString() ?? null,
    deliveryCompletedOn: r.deliveryCompletedOn?.toISOString() ?? null,
    closedOn: r.closedOn?.toISOString() ?? null,
  }));
}

// --- Disposal -----------------------------------------------------------------

export interface DisposalRow {
  readonly id: string;
  readonly reference: string;
  readonly kind: string;
  readonly description: string;
  readonly status: string;
  readonly initiatedOn: string;
  readonly bidOpensOn: string | null;
  readonly bidClosesOn: string | null;
  readonly awardedOn: string | null;
  readonly completedOn: string | null;
  readonly totalProceedsMinor: string | null;
  readonly currency: string;
  readonly lotCount: number;
  readonly awardedLotCount: number;
}

export async function listDisposals(): Promise<readonly DisposalRow[]> {
  const rows = await prisma.disposalCase.findMany({
    orderBy: { initiatedOn: 'desc' },
    include: { lots: { select: { winningBid: true } } },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    kind: r.kind,
    description: r.description,
    status: r.status,
    initiatedOn: r.initiatedOn.toISOString(),
    bidOpensOn: r.bidOpensOn?.toISOString() ?? null,
    bidClosesOn: r.bidClosesOn?.toISOString() ?? null,
    awardedOn: r.awardedOn?.toISOString() ?? null,
    completedOn: r.completedOn?.toISOString() ?? null,
    totalProceedsMinor: r.totalProceeds ? decimalToMinor(r.totalProceeds).toString() : null,
    currency: r.currency,
    lotCount: r.lots.length,
    awardedLotCount: r.lots.filter((l) => l.winningBid !== null).length,
  }));
}

export interface DisposalLotRow {
  readonly id: string;
  readonly caseId: string;
  readonly caseReference: string;
  readonly lotNumber: number;
  readonly description: string;
  readonly reservePriceMinor: string | null;
  readonly winningBidMinor: string | null;
  readonly winningBidderName: string | null;
  readonly currency: string;
  readonly awardedOn: string | null;
}

export async function listDisposalLots(caseId?: string): Promise<readonly DisposalLotRow[]> {
  const rows = await prisma.disposalLot.findMany({
    where: caseId ? { caseId } : undefined,
    orderBy: [{ caseId: 'asc' }, { lotNumber: 'asc' }],
    include: { case: { select: { reference: true } } },
    take: 500,
  });
  return rows.map((r) => ({
    id: r.id,
    caseId: r.caseId,
    caseReference: r.case.reference,
    lotNumber: r.lotNumber,
    description: r.description,
    reservePriceMinor: r.reservePrice ? decimalToMinor(r.reservePrice).toString() : null,
    winningBidMinor: r.winningBid ? decimalToMinor(r.winningBid).toString() : null,
    winningBidderName: r.winningBidderName,
    currency: r.currency,
    awardedOn: r.awardedOn?.toISOString() ?? null,
  }));
}

// --- Appeals ------------------------------------------------------------------

export interface AppealRow {
  readonly id: string;
  readonly grievanceId: string;
  readonly filedOn: string;
  readonly basis: string;
  readonly status: string;
  readonly decidedOn: string | null;
  readonly decisionText: string | null;
}

export async function listAppeals(): Promise<readonly AppealRow[]> {
  const rows = await prisma.appeal.findMany({ orderBy: { filedOn: 'desc' }, take: 200 });
  return rows.map((r) => ({
    id: r.id,
    grievanceId: r.grievanceId,
    filedOn: r.filedOn.toISOString(),
    basis: r.basis,
    status: r.status,
    decidedOn: r.decidedOn?.toISOString() ?? null,
    decisionText: r.decisionText,
  }));
}

// --- Pickers -----------------------------------------------------------------

export async function listFMSEligibleIndents(): Promise<readonly { readonly id: string; readonly indentNumber: string; readonly subject: string }[]> {
  // Any indent that has not yet been linked to an FMS case
  const rows = await prisma.indent.findMany({
    where: { fmsCase: null },
    orderBy: { createdAt: 'desc' },
    select: { id: true, indentNumber: true, subject: true },
    take: 100,
  });
  // Prisma relation name is `fmsCase` only if we add the back-relation on Indent — fall back to raw filter if not present
  return rows;
}

export async function listDecidedGrievances(): Promise<readonly { readonly id: string; readonly indentId: string; readonly status: string }[]> {
  return prisma.grievance.findMany({
    where: { status: { in: ['UPHELD', 'REJECTED'] }, appeal: null },
    orderBy: { grcDecisionOn: 'desc' },
    select: { id: true, indentId: true, status: true },
    take: 100,
  });
}
