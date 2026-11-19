import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { listPPRAInvoices } from '@/interfaces/ui/views/PPRAInvoiceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill, type PillTone } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { InvoiceActions } from './InvoiceActions';

export const metadata = { title: 'PPRA invoices • Procurement' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, PillTone> = {
  RECEIVED: 'info',
  RETURNED: 'danger',
  SENT_TO_DGPRN: 'warn',
  PAID: 'ok',
};

export default async function PPRAInvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRoles(PPRA_INVOICE_ROLES);
  const sp = await searchParams;
  const rows = await listPPRAInvoices({ status: sp.status });
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>PPRA invoices</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/finance/ppra-invoices/new">+ New invoice</Link>
      </div>
      <p className="muted">
        Invoices from PPRA (tender upload fees etc.). Flow: Received → Sent to DGPR(N) → Paid. A returned invoice is final —
        file PPRA&apos;s corrected invoice as a new invoice with its own number.
      </p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14 }}>
        <label htmlFor="statusFilter" className="muted">Status</label>
        <select id="statusFilter" name="status" className="select" defaultValue={sp.status ?? ''} style={{ width: 200 }}>
          <option value="">All statuses</option>
          <option value="RECEIVED">Received</option>
          <option value="RETURNED">Returned</option>
          <option value="SENT_TO_DGPRN">Sent to DGPR(N)</option>
          <option value="PAID">Paid</option>
        </select>
        <button className="btn">Filter</button>
        {sp.status && <Link className="btn" href="/finance/ppra-invoices">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty>No PPRA invoices{sp.status ? ' for this status' : ''}.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice no.</th>
                <th>Received on</th>
                <th>Amount</th>
                <th>Status</th>
                <th>IT Proformas</th>
                <th>Returned on</th>
                <th>Sent to DGPR(N) on</th>
                <th>Paid on</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href={`/finance/ppra-invoices/${r.id}`}>{r.invoiceNumber}</Link></td>
                  <td><DateLabel iso={r.receivedOn} /></td>
                  <td className="mono nowrap">{r.currency} {r.amountDisplay}</td>
                  <td>
                    <StatusPill tone={STATUS_TONE[r.status] ?? 'default'}>{r.status}</StatusPill>
                    {r.returnedReason && <div className="muted" style={{ fontSize: 12, marginTop: 4, whiteSpace: 'pre-wrap' }}>Reason: {r.returnedReason}</div>}
                  </td>
                  <td className="mono">{r.itReferences.join(', ')}</td>
                  <td><DateLabel iso={r.returnedOn} /></td>
                  <td><DateLabel iso={r.sentToDGPRNOn} /></td>
                  <td><DateLabel iso={r.paidOn} /></td>
                  <td><InvoiceActions id={r.id} invoiceNumber={r.invoiceNumber} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
