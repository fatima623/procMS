import { Role, Prisma, type IndentStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import type { AuthContext } from '@/application/ports/AuthContext';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Read-side projections for indent listing and detail pages. The listing
 * narrows by role: an INDENTER sees only their own; section staff see
 * indents in their section (owning or assigned); approval actors see
 * indents currently in the chain pool.
 */

export interface IndentRow {
  readonly id: string;
  readonly indentNumber: string;
  readonly controlNumber: string | null;
  readonly subject: string;
  readonly status: IndentStatus;
  readonly priority: string;
  readonly estimatedValueMinor: string;
  readonly currency: string;
  readonly submittedAt: string | null;
  readonly createdAt: string;
}

export interface IndentListResult {
  readonly items: readonly IndentRow[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

export interface ListVisibleIndentsOpts {
  readonly page?: number;
  readonly pageSize?: number;
  readonly search?: string;
  readonly status?: IndentStatus;
  readonly statuses?: readonly IndentStatus[];
  readonly sectionId?: string;
  readonly assignedAdpId?: string;
  readonly fiscalYearId?: string;
  readonly budgetHeadId?: string;
  readonly priority?: string;
  /** Decimal main-unit strings, e.g. "100000.00". */
  readonly minValue?: string;
  readonly maxValue?: string;
}

export async function listVisibleIndents(
  ctx: AuthContext,
  opts: ListVisibleIndentsOpts = {},
): Promise<IndentListResult> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 25));

  const where: Prisma.IndentWhereInput = {};
  const isPrivileged = ctx.roles.some((r) =>
    ([Role.ADMIN, Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.COORD_STAFF, Role.BUDGET_STAFF, Role.CR_STAFF, Role.INSPECTORATE] as Role[]).includes(r),
  );
  if (!isPrivileged) {
    where.indenterId = ctx.userId;
  }
  if (opts.statuses && opts.statuses.length > 0) {
    where.status = { in: [...opts.statuses] };
  } else if (opts.status) {
    where.status = opts.status;
  }
  if (opts.sectionId) where.sectionId = opts.sectionId;
  if (opts.assignedAdpId) where.assignedAdpId = opts.assignedAdpId;
  if (opts.fiscalYearId) where.fiscalYearId = opts.fiscalYearId;
  if (opts.budgetHeadId) where.budgetHeadId = opts.budgetHeadId;
  if (opts.priority) where.priority = opts.priority as Prisma.IndentWhereInput['priority'];
  if (opts.minValue || opts.maxValue) {
    where.estimatedValue = {
      ...(opts.minValue ? { gte: opts.minValue } : {}),
      ...(opts.maxValue ? { lte: opts.maxValue } : {}),
    };
  }
  if (opts.search) {
    where.OR = [
      { indentNumber: { contains: opts.search } },
      { controlNumber: { contains: opts.search } },
      { subject: { contains: opts.search } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.indent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.indent.count({ where }),
  ]);

  return {
    items: rows.map((r) => ({
      id: r.id,
      indentNumber: r.indentNumber,
      controlNumber: r.controlNumber,
      subject: r.subject,
      status: r.status,
      priority: r.priority,
      estimatedValueMinor: decimalToMinor(r.estimatedValue as unknown as string).toString(),
      currency: r.currency,
      submittedAt: r.submittedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * Aggregate counts + total value for the same filter the list page uses.
 * Keeps the SQL cheap: one groupBy for counts, one aggregate for value.
 */
export interface IndentListSummary {
  readonly total: number;
  readonly active: number;
  readonly awaitingApproval: number;
  readonly draft: number;
  readonly closed: number;
  readonly totalValueMinor: string;
}

const TERMINAL_STATUSES: IndentStatus[] = ['CLOSED', 'CANCELLED', 'INDENT_REJECTED', 'BUDGET_REJECTED'] as unknown as IndentStatus[];
const APPROVAL_STATUSES: IndentStatus[] = ['INDENT_APPROVAL', 'IT_APPROVAL', 'CST_APPROVAL', 'CPO_APPROVAL'] as unknown as IndentStatus[];

export async function summarizeVisibleIndents(
  ctx: AuthContext,
  opts: ListVisibleIndentsOpts = {},
): Promise<IndentListSummary> {
  const where: Prisma.IndentWhereInput = {};
  const isPrivileged = ctx.roles.some((r) =>
    ([Role.ADMIN, Role.AD, Role.DD, Role.DP_N, Role.DGDP, Role.SECY_DP, Role.SUPTD, Role.CPO, Role.COORD_STAFF, Role.BUDGET_STAFF, Role.CR_STAFF, Role.INSPECTORATE] as Role[]).includes(r),
  );
  if (!isPrivileged) where.indenterId = ctx.userId;
  if (opts.statuses && opts.statuses.length > 0) where.status = { in: [...opts.statuses] };
  else if (opts.status) where.status = opts.status;
  if (opts.sectionId) where.sectionId = opts.sectionId;
  if (opts.assignedAdpId) where.assignedAdpId = opts.assignedAdpId;
  if (opts.fiscalYearId) where.fiscalYearId = opts.fiscalYearId;
  if (opts.budgetHeadId) where.budgetHeadId = opts.budgetHeadId;
  if (opts.priority) where.priority = opts.priority as Prisma.IndentWhereInput['priority'];
  if (opts.minValue || opts.maxValue) {
    where.estimatedValue = {
      ...(opts.minValue ? { gte: opts.minValue } : {}),
      ...(opts.maxValue ? { lte: opts.maxValue } : {}),
    };
  }
  if (opts.search) {
    where.OR = [
      { indentNumber: { contains: opts.search } },
      { controlNumber: { contains: opts.search } },
      { subject: { contains: opts.search } },
    ];
  }

  const [grouped, agg] = await Promise.all([
    prisma.indent.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.indent.aggregate({ where, _sum: { estimatedValue: true } }),
  ]);

  let total = 0, active = 0, awaitingApproval = 0, draft = 0, closed = 0;
  for (const g of grouped) {
    const n = g._count._all;
    total += n;
    if (g.status === 'DRAFT') draft += n;
    if (TERMINAL_STATUSES.includes(g.status)) closed += n; else active += n;
    if (APPROVAL_STATUSES.includes(g.status)) awaitingApproval += n;
  }
  const sum = agg._sum.estimatedValue;
  const totalValueMinor = sum ? decimalToMinor(sum as unknown as string).toString() : '0';
  return { total, active, awaitingApproval, draft, closed, totalValueMinor };
}

export interface IndentDetailView {
  readonly id: string;
  readonly indentNumber: string;
  readonly controlNumber: string | null;
  readonly subject: string;
  readonly justification: string | null;
  readonly type: string;
  readonly priority: string;
  readonly status: IndentStatus;
  readonly estimatedValueMinor: string;
  readonly currency: string;
  readonly indenterId: string;
  readonly indenterName: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly assignedAdpId: string | null;
  readonly assignedAdpName: string | null;
  readonly fiscalYearLabel: string;
  readonly budgetHeadCode: string;
  readonly submittedAt: string | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly version: number;
  readonly items: readonly {
    readonly id: string;
    readonly lineNo: number;
    readonly itemCode: string | null;
    readonly description: string;
    readonly quantity: string;
    readonly uom: string;
    readonly unitPriceMinor: string;
    readonly currency: string;
  }[];
  readonly observations: readonly {
    readonly id: string;
    readonly note: string;
    readonly status: string;
    readonly createdAt: string;
    readonly resolvedAt: string | null;
    readonly raisedByName: string;
  }[];
  readonly chains: readonly {
    readonly id: string;
    readonly subject: string;
    readonly status: string;
    readonly currentIndex: number;
    readonly steps: readonly {
      readonly id: string;
      readonly stepIndex: number;
      readonly role: string;
      readonly status: string;
      readonly decidedAt: string | null;
      readonly decidedByName: string | null;
      readonly comments: string | null;
    }[];
  }[];
  readonly itPerforma: {
    readonly id: string;
    readonly reference: string;
    readonly status: string;
    readonly invitedFirmCount: number;
    readonly dispatchedAt: string | null;
    readonly closingAt: string | null;
  } | null;
  readonly tsr: { readonly id: string; readonly status: string } | null;
  readonly cst: { readonly id: string; readonly status: string; readonly singleQuote: boolean } | null;
  readonly pr: { readonly id: string; readonly prNumber: string; readonly status: string } | null;
  readonly commercialOfferCount: number;
  readonly technicalOfferCount: number;
  readonly attachments: readonly {
    readonly id: string;
    readonly originalName: string;
    readonly mimeType: string;
    readonly sizeBytes: string;
    readonly uploadedAt: string;
    readonly uploadedByName: string | null;
  }[];
}

export async function loadIndentDetail(indentId: string): Promise<IndentDetailView | null> {
  const row = await prisma.indent.findUnique({
    where: { id: indentId },
    include: {
      items: { orderBy: { lineNo: 'asc' } },
      indenter: true,
      section: true,
      assignedAdp: true,
      fiscalYear: true,
      budgetHead: true,
      observations: { include: { raisedBy: true }, orderBy: { createdAt: 'desc' } },
      itPerforma: {
        include: {
          firms: true,
          tsr: true,
          cst: { include: { purchaseRequisition: true } },
          _count: { select: { technicalOffers: true, commercialOffers: true } },
        },
      },
    },
  });
  if (!row) return null;

  // Attachments are polymorphic; fetch separately then join uploader name.
  const attachmentRows = await prisma.attachment.findMany({
    where: { subject: 'INDENT', subjectId: indentId },
    orderBy: { uploadedAt: 'desc' },
  });
  const uploaderIds = [...new Set(attachmentRows.map((a) => a.uploadedByUserId))];
  const uploaders = await prisma.user.findMany({
    where: { id: { in: uploaderIds } },
    select: { id: true, displayName: true },
  });
  const uploaderNameById = new Map(uploaders.map((u) => [u.id, u.displayName]));

  const chainRows = await prisma.approvalChain.findMany({
    where: {
      OR: [
        { subject: 'INDENT', subjectId: row.id },
        ...(row.itPerforma ? [{ subject: 'IT_PROFORMA' as const, subjectId: row.itPerforma.id }] : []),
        ...(row.itPerforma?.cst ? [{ subject: 'CST' as const, subjectId: row.itPerforma.cst.id }] : []),
      ],
    },
    include: {
      steps: { include: { decidedBy: true }, orderBy: { stepIndex: 'asc' } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    id: row.id,
    indentNumber: row.indentNumber,
    controlNumber: row.controlNumber,
    subject: row.subject,
    justification: row.justification,
    type: row.type,
    priority: row.priority,
    status: row.status,
    estimatedValueMinor: decimalToMinor(row.estimatedValue as unknown as string).toString(),
    currency: row.currency,
    indenterId: row.indenterId,
    indenterName: row.indenter.displayName,
    sectionId: row.sectionId,
    sectionName: row.section.name,
    assignedAdpId: row.assignedAdpId,
    assignedAdpName: row.assignedAdp?.name ?? null,
    fiscalYearLabel: row.fiscalYear.label,
    budgetHeadCode: row.budgetHead.code,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    closedAt: row.closedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    version: row.version,
    items: row.items.map((it) => ({
      id: it.id,
      lineNo: it.lineNo,
      itemCode: it.itemCode,
      description: it.description,
      quantity: (it.quantity as unknown as { toString(): string }).toString(),
      uom: it.uom,
      unitPriceMinor: decimalToMinor(it.estimatedUnitPrice as unknown as string).toString(),
      currency: it.currency,
    })),
    observations: row.observations.map((o) => ({
      id: o.id,
      note: o.note,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
      resolvedAt: o.resolvedAt?.toISOString() ?? null,
      raisedByName: o.raisedBy.displayName,
    })),
    chains: chainRows.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      currentIndex: c.currentIndex,
      steps: c.steps.map((s) => ({
        id: s.id,
        stepIndex: s.stepIndex,
        role: s.role,
        status: s.status,
        decidedAt: s.decidedAt?.toISOString() ?? null,
        decidedByName: s.decidedBy?.displayName ?? null,
        comments: s.comments,
      })),
    })),
    itPerforma: row.itPerforma
      ? {
          id: row.itPerforma.id,
          reference: row.itPerforma.reference,
          status: row.itPerforma.status,
          invitedFirmCount: row.itPerforma.firms.length,
          dispatchedAt: row.itPerforma.dispatchedAt?.toISOString() ?? null,
          closingAt: row.itPerforma.closingAt?.toISOString() ?? null,
        }
      : null,
    tsr: row.itPerforma?.tsr ? { id: row.itPerforma.tsr.id, status: row.itPerforma.tsr.status } : null,
    cst: row.itPerforma?.cst
      ? { id: row.itPerforma.cst.id, status: row.itPerforma.cst.status, singleQuote: row.itPerforma.cst.singleQuote }
      : null,
    pr: row.itPerforma?.cst?.purchaseRequisition
      ? {
          id: row.itPerforma.cst.purchaseRequisition.id,
          prNumber: row.itPerforma.cst.purchaseRequisition.prNumber,
          status: row.itPerforma.cst.purchaseRequisition.status,
        }
      : null,
    commercialOfferCount: row.itPerforma?._count.commercialOffers ?? 0,
    technicalOfferCount: row.itPerforma?._count.technicalOffers ?? 0,
    attachments: attachmentRows.map((a) => ({
      id: a.id,
      originalName: a.originalName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes.toString(),
      uploadedAt: a.uploadedAt.toISOString(),
      uploadedByName: uploaderNameById.get(a.uploadedByUserId) ?? null,
    })),
  };
}

export async function loadReferenceData(): Promise<{
  readonly fiscalYears: readonly { id: string; label: string; isActive: boolean }[];
  readonly budgetHeads: readonly { id: string; code: string; description: string }[];
}> {
  const [fiscalYears, budgetHeads] = await Promise.all([
    prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } }),
    prisma.budgetHead.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, description: true } }),
  ]);
  return { fiscalYears, budgetHeads };
}

export async function loadFilterReferenceData(): Promise<{
  readonly sections: readonly { id: string; code: string; name: string; kind: string }[];
  readonly fiscalYears: readonly { id: string; label: string; isActive: boolean }[];
  readonly budgetHeads: readonly { id: string; code: string }[];
}> {
  const [sections, fiscalYears, budgetHeads] = await Promise.all([
    prisma.section.findMany({ where: { isActive: true }, orderBy: [{ kind: 'asc' }, { code: 'asc' }], select: { id: true, code: true, name: true, kind: true } }),
    prisma.fiscalYear.findMany({ orderBy: { startsOn: 'desc' }, select: { id: true, label: true, isActive: true } }),
    prisma.budgetHead.findMany({ where: { isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true } }),
  ]);
  return { sections, fiscalYears, budgetHeads };
}
