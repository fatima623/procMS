import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRoles } from '@/interfaces/ui/auth';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { ACKABLE_INVOICE_STATUSES } from '@/infrastructure/finance/DGPRNAckService';
import { loadPPRAInvoiceDetail } from '@/interfaces/ui/views/DGPRNAckViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'PPRA invoice • Procurement' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = {
  RECEIVED: 'info',
  RETURNED: 'danger',
  SENT_TO_DGPRN: 'warn',
  PAID: 'ok',
};

/** Read-only PPRA invoice detail with its DGPR(N) acknowledgements. Actions stay on the list page. */
export default async function PPRAInvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRoles(PPRA_INVOICE_ROLES);
  const inv = await loadPPRAInvoiceDetail(id);
  if (!inv) notFound();
  const ackable = ACKABLE_INVOICE_STATUSES.includes(inv.status);

  return (
    <>
      <div className="row" style={{ marginBottom: 6 }}>
        <Link href="/finance/ppra-invoices" className="muted">← PPRA invoices</Link>
      </div>
      <div className="row" style={{ marginBottom: 16, gap: 10 }}>
        <h1 style={{ margin: 0 }} className="mono">{inv.invoiceNumber}</h1>
        <StatusPill tone={STATUS_TONE[inv.status] ?? 'default'}>{inv.status}</StatusPill>
      </div>

      <section className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ marginTop: 0 }}>Invoice</h2>
        <table className="table">
          <tbody>
            <tr><th style={{ width: 220 }}>Invoice number</th><td className="mono">{inv.invoiceNumber}</td></tr>
            <tr><th>Received on</th><td><DateLabel iso={inv.receivedOn} /></td></tr>
            <tr><th>Amount</th><td className="mono">{inv.currency} {inv.amountDisplay}</td></tr>
            <tr><th>Status</th><td>{inv.status}</td></tr>
            <tr><th>Returned on</th><td><DateLabel iso={inv.returnedOn} /></td></tr>
            <tr><th>Return reason</th><td style={{ whiteSpace: 'pre-wrap' }}>{inv.returnedReason ?? <span className="muted">—</span>}</td></tr>
            <tr><th>Sent to DGPR(N) on</th><td><DateLabel iso={inv.sentToDGPRNOn} /></td></tr>
            <tr><th>Paid on</th><td><DateLabel iso={inv.paidOn} /></td></tr>
            <tr><th>Document</th><td className="mono">{inv.documentKey ?? <span className="muted">—</span>}</td></tr>
            <tr><th>IT Proformas</th><td className="mono">{inv.itReferences.length ? inv.itReferences.join(', ') : <span className="muted">—</span>}</td></tr>
            <tr><th>Recorded</th><td><DateLabel iso={inv.createdAt} /></td></tr>
          </tbody>
        </table>
      </section>

      <section className="card" style={{ padding: 20 }}>
        <div className="row" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>DGPR(N) acknowledgements ({inv.acknowledgements.length})</h2>
          <div className="grow" />
          {ackable && (
            <Link className="btn btn-primary" href={`/finance/dgprn-acknowledgements/new?invoiceId=${inv.id}`}>Record DGPR(N) ack</Link>
          )}
        </div>
        {!ackable && (
          <p className="muted" style={{ marginTop: 0 }}>Acknowledgements can be recorded once the invoice has been sent to DGPR(N).</p>
        )}
        {inv.acknowledgements.length === 0 ? (
          <Empty>No acknowledgements for this invoice yet.</Empty>
        ) : (
          <table className="table">
            <thead><tr><th>Reference no.</th><th>Received on</th><th>IT Proforma</th><th>Remarks</th></tr></thead>
            <tbody>
              {inv.acknowledgements.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.referenceNumber}</td>
                  <td><DateLabel iso={a.receivedOn} /></td>
                  <td className="mono">{a.itReference ?? <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'pre-wrap' }}>{a.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
