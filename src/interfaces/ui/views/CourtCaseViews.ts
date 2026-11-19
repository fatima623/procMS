import { CourtCaseStatus, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

/** Latest proceeding first: highest hearing date, ties broken by entry time. */
const LATEST_FIRST: Prisma.CourtProceedingOrderByWithRelationInput[] = [{ hearingDate: 'desc' }, { createdAt: 'desc' }];

export interface CourtCaseRow {
  readonly id: string;
  readonly caseNumber: string;
  readonly court: string;
  readonly party: string;
  readonly counterParty: string;
  readonly status: CourtCaseStatus;
  readonly filedOn: string;
  /** From the latest proceeding; null when none or not set. */
  readonly nextHearingDate: string | null;
}

export async function listCourtCases(filter: { status?: string; q?: string } = {}): Promise<readonly CourtCaseRow[]> {
  const where: Prisma.CourtCaseWhereInput = {};
  if (filter.status && (Object.values(CourtCaseStatus) as string[]).includes(filter.status)) {
    where.status = filter.status as CourtCaseStatus;
  }
  const q = filter.q?.trim();
  if (q) {
    where.OR = [{ caseNumber: { contains: q } }, { court: { contains: q } }, { party: { contains: q } }];
  }
  const rows = await prisma.courtCase.findMany({
    where,
    orderBy: [{ filedOn: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: { proceedings: { orderBy: LATEST_FIRST, take: 1, select: { nextHearingDate: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    caseNumber: r.caseNumber,
    court: r.court,
    party: r.party,
    counterParty: r.counterParty,
    status: r.status,
    filedOn: r.filedOn.toISOString(),
    nextHearingDate: r.proceedings[0]?.nextHearingDate?.toISOString() ?? null,
  }));
}

export interface CourtProceedingView {
  readonly id: string;
  readonly hearingDate: string;
  readonly outcome: string;
  readonly nextHearingDate: string | null;
  readonly notes: string | null;
  readonly documentKey: string | null;
  readonly createdByName: string | null;
}

export interface CourtCaseDetail {
  readonly id: string;
  readonly caseNumber: string;
  readonly court: string;
  readonly party: string;
  readonly counterParty: string;
  readonly status: CourtCaseStatus;
  readonly filedOn: string;
  readonly relatedIndent: { readonly id: string; readonly label: string } | null;
  readonly relatedContractLabel: string | null;
  readonly documentKey: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  /** From the latest proceeding; null when none or not set. */
  readonly nextHearingDate: string | null;
  /** Newest hearing first. */
  readonly proceedings: readonly CourtProceedingView[];
}

export async function loadCourtCase(id: string): Promise<CourtCaseDetail | null> {
  const r = await prisma.courtCase.findUnique({
    where: { id },
    include: { proceedings: { orderBy: LATEST_FIRST } },
  });
  if (!r) return null;
  const [names, indent, contract] = await Promise.all([
    userNames([r.createdByUserId, ...r.proceedings.map((p) => p.createdByUserId)]),
    r.relatedIndentId
      ? prisma.indent.findUnique({ where: { id: r.relatedIndentId }, select: { id: true, indentNumber: true, subject: true } })
      : Promise.resolve(null),
    r.relatedContractId
      ? prisma.contract.findUnique({ where: { id: r.relatedContractId }, select: { contractNumber: true } })
      : Promise.resolve(null),
  ]);
  return {
    id: r.id,
    caseNumber: r.caseNumber,
    court: r.court,
    party: r.party,
    counterParty: r.counterParty,
    status: r.status,
    filedOn: r.filedOn.toISOString(),
    relatedIndent: indent ? { id: indent.id, label: `${indent.indentNumber} — ${indent.subject}` } : null,
    relatedContractLabel: contract?.contractNumber ?? null,
    documentKey: r.documentKey,
    createdByName: names.get(r.createdByUserId) ?? null,
    createdAt: r.createdAt.toISOString(),
    nextHearingDate: r.proceedings[0]?.nextHearingDate?.toISOString() ?? null,
    proceedings: r.proceedings.map((p) => ({
      id: p.id,
      hearingDate: p.hearingDate.toISOString(),
      outcome: p.outcome,
      nextHearingDate: p.nextHearingDate?.toISOString() ?? null,
      notes: p.notes,
      documentKey: p.documentKey,
      createdByName: names.get(p.createdByUserId) ?? null,
    })),
  };
}

// --- dropdown options -----------------------------------------------------------

export async function listIndentOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.indent.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, indentNumber: true, subject: true },
  });
  return rows.map((r) => ({ id: r.id, label: `${r.indentNumber} — ${r.subject.slice(0, 60)}` }));
}

export async function listContractOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.contract.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, contractNumber: true },
  });
  return rows.map((r) => ({ id: r.id, label: r.contractNumber }));
}

// --- helpers ------------------------------------------------------------------

async function userNames(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true } });
  return new Map(users.map((u) => [u.id, u.displayName]));
}
