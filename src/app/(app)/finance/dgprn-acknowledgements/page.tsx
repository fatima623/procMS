import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { listDGPRNAcks } from '@/interfaces/ui/views/DGPRNAckViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'DGPR(N) acknowledgements • Procurement' };
export const dynamic = 'force-dynamic';

export default async function DGPRNAcksPage() {
  await requireRoles(PPRA_INVOICE_ROLES);
  const rows = await listDGPRNAcks();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>DGPR(N) acknowledgements</h1>
        <div className="grow" />
        <Link className="btn" href="/finance/ppra-invoices">PPRA invoices</Link>
        <Link className="btn btn-primary" href="/finance/dgprn-acknowledgements/new">+ Record acknowledgement</Link>
      </div>
      <p className="muted">DGPR(N)&apos;s acknowledgement of a forwarded PPRA invoice and/or an IT publication.</p>

      {rows.length === 0 ? (
        <Empty>No acknowledgements recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Reference no.</th>
                <th>Received on</th>
                <th>PPRA invoice</th>
                <th>IT Proforma</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.referenceNumber}</td>
                  <td><DateLabel iso={r.receivedOn} /></td>
                  <td className="mono">
                    {r.invoiceId ? <Link href={`/finance/ppra-invoices/${r.invoiceId}`}>{r.invoiceNumber}</Link> : <span className="muted">—</span>}
                  </td>
                  <td className="mono">{r.itReference ?? <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: 360 }}>{r.remarks ?? <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
