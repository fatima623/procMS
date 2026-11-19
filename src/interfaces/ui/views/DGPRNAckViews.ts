import { PPRAInvoiceStatus, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

export interface DGPRNAckRow {
  readonly id: string;
  readonly referenceNumber: string;
  readonly receivedOn: string;
  readonly invoiceId: string | null;
  readonly invoiceNumber: string | null;
  readonly itReference: string | null;
  readonly remarks: string | null;
}

const ACK_INCLUDE = {
  invoice: { select: { invoiceNumber: true } },
  itPerforma: { select: { reference: true } },
} satisfies Prisma.DGPRNAcknowledgementInclude;

type AckRecord = Prisma.DGPRNAcknowledgementGetPayload<{ include: typeof ACK_INCLUDE }>;

export async function listDGPRNAcks(): Promise<readonly DGPRNAckRow[]> {
  const rows = await prisma.dGPRNAcknowledgement.findMany({
    orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: ACK_INCLUDE,
  });
  return rows.map(toAckRow);
}

/** Only invoices DGPR(N) can acknowledge (SENT_TO_DGPRN / PAID), newest first. */
export async function listAckableInvoiceOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.pPRAInvoice.findMany({
    where: { status: { in: [PPRAInvoiceStatus.SENT_TO_DGPRN, PPRAInvoiceStatus.PAID] } },
    orderBy: { receivedOn: 'desc' },
    take: 300,
    select: { id: true, invoiceNumber: true, amount: true, currency: true, status: true },
  });
  return rows.map((r) => ({ id: r.id, label: `${r.invoiceNumber} — ${r.currency} ${formatAmount2(r.amount)} (${r.status})` }));
}

export interface PPRAInvoiceDetail {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly receivedOn: string;
  /** Display only — 2 decimals. The stored value keeps 4 decimals. */
  readonly amountDisplay: string;
  readonly currency: string;
  readonly status: PPRAInvoiceStatus;
  readonly returnedReason: string | null;
  readonly returnedOn: string | null;
  readonly sentToDGPRNOn: string | null;
  readonly paidOn: string | null;
  readonly documentKey: string | null;
  readonly createdAt: string;
  readonly itReferences: readonly string[];
  readonly acknowledgements: readonly DGPRNAckRow[];
}

/** One PPRA invoice with its linked IT references and DGPR(N) acknowledgements. */
export async function loadPPRAInvoiceDetail(id: string): Promise<PPRAInvoiceDetail | null> {
  const r = await prisma.pPRAInvoice.findUnique({
    where: { id },
    include: {
      itLinks: { include: { itPerforma: { select: { reference: true } } } },
      dgprnAcknowledgements: { orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }], include: ACK_INCLUDE },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    receivedOn: r.receivedOn.toISOString(),
    amountDisplay: formatAmount2(r.amount),
    currency: r.currency,
    status: r.status,
    returnedReason: r.returnedReason,
    returnedOn: r.returnedOn?.toISOString() ?? null,
    sentToDGPRNOn: r.sentToDGPRNOn?.toISOString() ?? null,
    paidOn: r.paidOn?.toISOString() ?? null,
    documentKey: r.documentKey,
    createdAt: r.createdAt.toISOString(),
    itReferences: r.itLinks.map((l) => l.itPerforma.reference).sort(),
    acknowledgements: r.dgprnAcknowledgements.map(toAckRow),
  };
}

// --- helpers ----------------------------------------------------------------

function toAckRow(a: AckRecord): DGPRNAckRow {
  return {
    id: a.id,
    referenceNumber: a.referenceNumber,
    receivedOn: a.receivedOn.toISOString(),
    invoiceId: a.invoiceId,
    invoiceNumber: a.invoice?.invoiceNumber ?? null,
    itReference: a.itPerforma?.reference ?? null,
    remarks: a.remarks,
  };
}

/** 1234567.5 → "1,234,567.50". Display rounding only; never written back. */
function formatAmount2(d: Prisma.Decimal): string {
  const [whole, frac] = d.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}
