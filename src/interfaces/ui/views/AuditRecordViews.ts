import { AuditRecordStatus, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { formatMinor2 } from '@/interfaces/http/schemas/audit';

// Audit Section views (v4.4.1 §4.29–§4.30) — audit RECORDS / objections / items.
// Not to be confused with AuditViews.ts, which serves the admin audit LOG.

export interface AuditRecordRow {
  readonly id: string;
  readonly auditSection: string;
  readonly fiscalYearLabel: string | null;
  readonly status: AuditRecordStatus;
  readonly raisedOn: string;
  readonly objectionCount: number;
  readonly itemCount: number;
}

export interface AuditRecordFilter {
  readonly status?: string;
  readonly fiscalYearId?: string;
  readonly q?: string;
}

export async function listAuditRecords(filter: AuditRecordFilter = {}): Promise<readonly AuditRecordRow[]> {
  const where: Prisma.AuditRecordWhereInput = {};
  if (filter.status && (Object.values(AuditRecordStatus) as string[]).includes(filter.status)) {
    where.status = filter.status as AuditRecordStatus;
  }
  if (filter.fiscalYearId) where.fiscalYearId = filter.fiscalYearId;
  const q = filter.q?.trim();
  if (q) where.auditSection = { contains: q };

  const rows = await prisma.auditRecord.findMany({
    where,
    orderBy: [{ raisedOn: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: { _count: { select: { objections: true, items: true } } },
  });
  const fyLabels = await fiscalYearLabels(rows.map((r) => r.fiscalYearId));
  return rows.map((r) => ({
    id: r.id,
    auditSection: r.auditSection,
    fiscalYearLabel: fyLabels.get(r.fiscalYearId) ?? null,
    status: r.status,
    raisedOn: r.raisedOn.toISOString(),
    objectionCount: r._count.objections,
    itemCount: r._count.items,
  }));
}

export interface AuditObjectionView {
  readonly id: string;
  readonly para: string;
  readonly ground: string;
  /** "PKR 1,234.50" (2 decimals, display only) or null. */
  readonly amountDisplay: string | null;
  readonly status: string;
  readonly replyText: string | null;
  readonly repliedOn: string | null;
  readonly repliedByName: string | null;
  readonly linkedItemCount: number;
}

export interface AuditItemView {
  readonly id: string;
  readonly itemText: string;
  readonly status: string;
  readonly replyText: string | null;
  readonly linkedObjectionIds: readonly string[];
  readonly linkedObjectionParas: readonly string[];
  readonly draftParas: readonly {
    readonly id: string;
    readonly paraText: string;
    readonly submittedOn: string;
    readonly createdByName: string | null;
  }[];
}

export interface AuditRecordDetail {
  readonly id: string;
  readonly auditSection: string;
  readonly fiscalYearLabel: string | null;
  readonly status: AuditRecordStatus;
  readonly raisedOn: string;
  readonly subjectIndent: { readonly id: string; readonly label: string } | null;
  readonly subjectContractLabel: string | null;
  readonly documentKey: string | null;
  readonly createdByName: string | null;
  readonly createdAt: string;
  readonly objections: readonly AuditObjectionView[];
  readonly items: readonly AuditItemView[];
}

export async function loadAuditRecord(id: string): Promise<AuditRecordDetail | null> {
  const r = await prisma.auditRecord.findUnique({
    where: { id },
    include: {
      objections: { orderBy: { createdAt: 'asc' }, include: { _count: { select: { itemLinks: true } } } },
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          draftParas: { orderBy: [{ submittedOn: 'asc' }, { createdAt: 'asc' }] },
          objectionLinks: { select: { auditObjectionId: true } },
        },
      },
    },
  });
  if (!r) return null;

  const [fyLabels, names, indent, contract] = await Promise.all([
    fiscalYearLabels([r.fiscalYearId]),
    userNames([
      r.createdByUserId,
      ...r.objections.map((o) => o.repliedByUserId),
      ...r.items.flatMap((i) => i.draftParas.map((p) => p.createdByUserId)),
    ]),
    r.subjectIndentId
      ? prisma.indent.findUnique({ where: { id: r.subjectIndentId }, select: { id: true, indentNumber: true, subject: true } })
      : Promise.resolve(null),
    r.subjectContractId
      ? prisma.contract.findUnique({ where: { id: r.subjectContractId }, select: { contractNumber: true } })
      : Promise.resolve(null),
  ]);
  const paraById = new Map(r.objections.map((o) => [o.id, o.para]));

  return {
    id: r.id,
    auditSection: r.auditSection,
    fiscalYearLabel: fyLabels.get(r.fiscalYearId) ?? null,
    status: r.status,
    raisedOn: r.raisedOn.toISOString(),
    subjectIndent: indent ? { id: indent.id, label: `${indent.indentNumber} — ${indent.subject}` } : null,
    subjectContractLabel: contract?.contractNumber ?? null,
    documentKey: r.documentKey,
    createdByName: names.get(r.createdByUserId) ?? null,
    createdAt: r.createdAt.toISOString(),
    objections: r.objections.map((o) => ({
      id: o.id,
      para: o.para,
      ground: o.ground,
      amountDisplay: o.amountInvolvedMinor !== null ? `${o.currency ?? ''} ${formatMinor2(o.amountInvolvedMinor)}`.trim() : null,
      status: o.status,
      replyText: o.replyText,
      repliedOn: o.repliedOn?.toISOString() ?? null,
      repliedByName: o.repliedByUserId ? (names.get(o.repliedByUserId) ?? null) : null,
      linkedItemCount: o._count.itemLinks,
    })),
    items: r.items.map((i) => ({
      id: i.id,
      itemText: i.itemText,
      status: i.status,
      replyText: i.replyText,
      linkedObjectionIds: i.objectionLinks.map((l) => l.auditObjectionId),
      linkedObjectionParas: i.objectionLinks.map((l) => paraById.get(l.auditObjectionId) ?? l.auditObjectionId),
      draftParas: i.draftParas.map((p) => ({
        id: p.id,
        paraText: p.paraText,
        submittedOn: p.submittedOn.toISOString(),
        createdByName: names.get(p.createdByUserId) ?? null,
      })),
    })),
  };
}

// --- dropdown options -----------------------------------------------------------

export async function listFiscalYearOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true } });
  return rows.map((r) => ({ id: r.id, label: r.label }));
}

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

async function fiscalYearLabels(ids: readonly string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await prisma.fiscalYear.findMany({ where: { id: { in: unique } }, select: { id: true, label: true } });
  return new Map(rows.map((r) => [r.id, r.label]));
}

async function userNames(ids: readonly (string | null | undefined)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: unique } }, select: { id: true, displayName: true } });
  return new Map(users.map((u) => [u.id, u.displayName]));
}
