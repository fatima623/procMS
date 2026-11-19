import { PPRAInvoiceStatus, Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';

export interface PPRAInvoiceRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly receivedOn: string;
  /** Display only — 2 decimals, thousands-grouped. The stored value keeps 4 decimals. */
  readonly amountDisplay: string;
  readonly currency: string;
  readonly status: PPRAInvoiceStatus;
  readonly returnedReason: string | null;
  readonly returnedOn: string | null;
  readonly sentToDGPRNOn: string | null;
  readonly paidOn: string | null;
  readonly documentKey: string | null;
  readonly itReferences: readonly string[];
}

export async function listPPRAInvoices(filter: { status?: string } = {}): Promise<readonly PPRAInvoiceRow[]> {
  const where: Prisma.PPRAInvoiceWhereInput = {};
  if (filter.status && (Object.values(PPRAInvoiceStatus) as string[]).includes(filter.status)) {
    where.status = filter.status as PPRAInvoiceStatus;
  }
  const rows = await prisma.pPRAInvoice.findMany({
    where,
    orderBy: [{ receivedOn: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: { itLinks: { include: { itPerforma: { select: { reference: true } } } } },
  });
  return rows.map((r) => ({
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
    itReferences: r.itLinks.map((l) => l.itPerforma.reference).sort(),
  }));
}

/** IT Proformas, newest first — for the "covers which tenders" checkboxes. */
export async function listITProformaOptions(): Promise<readonly { id: string; label: string }[]> {
  const rows = await prisma.iTPerforma.findMany({
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: { id: true, reference: true, indent: { select: { indentNumber: true, subject: true } } },
  });
  return rows.map((r) => ({ id: r.id, label: `${r.reference} — ${r.indent.indentNumber}: ${r.indent.subject.slice(0, 60)}` }));
}

/** 1234567.5 → "1,234,567.50". Display rounding only; never written back. */
function formatAmount2(d: Prisma.Decimal): string {
  const [whole, frac] = d.toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${frac}`;
}
