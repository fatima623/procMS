import { prisma } from '@/infrastructure/db/prisma';
import { decimalToMinor } from '@/infrastructure/common/decimal';

/**
 * Read models for the firm-rep landing pages — invited ITs (that haven't
 * had an offer submitted yet), open queries, and sent PRs awaiting ack.
 */

export interface FirmInviteRow {
  readonly itId: string;
  readonly reference: string;
  readonly closingAt: string | null;
  readonly dispatchedAt: string | null;
  readonly alreadySubmitted: boolean;
  readonly indentSubject: string;
}

export async function listFirmInvites(firmId: string): Promise<readonly FirmInviteRow[]> {
  const rows = await prisma.iTFirmInvite.findMany({
    where: { firmId, itPerforma: { status: 'DISPATCHED' } },
    include: {
      itPerforma: {
        select: {
          id: true,
          reference: true,
          closingAt: true,
          dispatchedAt: true,
          indent: { select: { subject: true } },
          technicalOffers: { where: { firmId }, select: { id: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    itId: r.itPerforma.id,
    reference: r.itPerforma.reference,
    closingAt: r.itPerforma.closingAt?.toISOString() ?? null,
    dispatchedAt: r.itPerforma.dispatchedAt?.toISOString() ?? null,
    alreadySubmitted: r.itPerforma.technicalOffers.length > 0,
    indentSubject: r.itPerforma.indent.subject,
  }));
}

export interface FirmQueryRow {
  readonly tsrId: string;
  readonly queryId: string;
  readonly question: string;
  readonly askedAt: string;
  readonly indentSubject: string;
}

export async function listFirmOpenQueries(firmId: string): Promise<readonly FirmQueryRow[]> {
  const rows = await prisma.tSRQuery.findMany({
    where: { firmId, status: 'OPEN' },
    include: {
      tsr: { select: { id: true, itPerforma: { select: { indent: { select: { subject: true } } } } } },
    },
    orderBy: { askedAt: 'asc' },
  });
  return rows.map((r) => ({
    tsrId: r.tsrId,
    queryId: r.id,
    question: r.question,
    askedAt: r.askedAt.toISOString(),
    indentSubject: r.tsr.itPerforma.indent.subject,
  }));
}

export interface FirmPRRow {
  readonly id: string;
  readonly prNumber: string;
  readonly amountMinor: string;
  readonly currency: string;
  readonly status: string;
  readonly faxedAt: string | null;
}

export async function listFirmPRs(firmId: string): Promise<readonly FirmPRRow[]> {
  const rows = await prisma.purchaseRequisition.findMany({
    where: { firmId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return rows.map((r) => ({
    id: r.id,
    prNumber: r.prNumber,
    amountMinor: decimalToMinor(r.amount as unknown as string).toString(),
    currency: r.currency,
    status: r.status,
    faxedAt: r.faxedAt?.toISOString() ?? null,
  }));
}
