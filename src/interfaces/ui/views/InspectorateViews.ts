import { prisma } from '@/infrastructure/db/prisma';

export interface InspectorateITRow {
  readonly itId: string;
  readonly reference: string;
  readonly indentSubject: string;
  readonly offerCount: number;
  readonly tsrId: string | null;
  readonly tsrStatus: string | null;
  readonly dispatchedAt: string | null;
}

export async function listITsAwaitingTSR(): Promise<readonly InspectorateITRow[]> {
  const rows = await prisma.iTPerforma.findMany({
    where: {
      status: 'DISPATCHED',
      indent: { status: { in: ['TECH_OFFERS_OPEN', 'TSR_IN_PROGRESS'] } },
    },
    include: {
      tsr: true,
      indent: { select: { subject: true } },
      _count: { select: { technicalOffers: true } },
    },
    orderBy: { dispatchedAt: 'asc' },
  });
  return rows.map((r) => ({
    itId: r.id,
    reference: r.reference,
    indentSubject: r.indent.subject,
    offerCount: r._count.technicalOffers,
    tsrId: r.tsr?.id ?? null,
    tsrStatus: r.tsr?.status ?? null,
    dispatchedAt: r.dispatchedAt?.toISOString() ?? null,
  }));
}

export interface TSRDetailView {
  readonly id: string;
  readonly itId: string;
  readonly itReference: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly status: string;
  readonly summary: string | null;
  readonly submittedAt: string | null;
  readonly completedAt: string | null;
  readonly offers: readonly {
    readonly id: string;
    readonly firmId: string;
    readonly firmName: string;
    readonly submittedAt: string;
    readonly status: string;
    readonly evaluation: { readonly verdict: string; readonly remarks: string | null } | null;
  }[];
  readonly queries: readonly {
    readonly id: string;
    readonly firmId: string;
    readonly firmName: string;
    readonly question: string;
    readonly response: string | null;
    readonly status: string;
    readonly askedAt: string;
    readonly answeredAt: string | null;
  }[];
}

export async function loadTSRDetail(tsrId: string): Promise<TSRDetailView | null> {
  const row = await prisma.technicalScrutinyReport.findUnique({
    where: { id: tsrId },
    include: {
      evaluations: true,
      queries: { include: { firm: true }, orderBy: { askedAt: 'asc' } },
      itPerforma: {
        include: {
          indent: { select: { id: true, subject: true } },
          technicalOffers: { include: { firm: true }, orderBy: { submittedAt: 'asc' } },
        },
      },
    },
  });
  if (!row) return null;
  const evByOffer = new Map(row.evaluations.map((e) => [e.technicalOfferId, e]));
  return {
    id: row.id,
    itId: row.itPerforma.id,
    itReference: row.itPerforma.reference,
    indentId: row.itPerforma.indent.id,
    indentSubject: row.itPerforma.indent.subject,
    status: row.status,
    summary: row.summary,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
    offers: row.itPerforma.technicalOffers.map((o) => ({
      id: o.id,
      firmId: o.firmId,
      firmName: o.firm.name,
      submittedAt: o.submittedAt.toISOString(),
      status: o.status,
      evaluation: (() => {
        const e = evByOffer.get(o.id);
        return e ? { verdict: e.verdict, remarks: e.remarks } : null;
      })(),
    })),
    queries: row.queries.map((q) => ({
      id: q.id,
      firmId: q.firmId,
      firmName: q.firm.name,
      question: q.question,
      response: q.response,
      status: q.status,
      askedAt: q.askedAt.toISOString(),
      answeredAt: q.answeredAt?.toISOString() ?? null,
    })),
  };
}
