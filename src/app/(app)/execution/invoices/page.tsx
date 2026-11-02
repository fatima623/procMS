import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listInvoices } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Invoices • Procurement' };
export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listInvoices();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Invoices</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/invoices/new">+ Record invoice</Link>
      </div>
      <p className="muted">Running bills / invoices received from the supplier. Payments reference these records.</p>

      {rows.length === 0 ? (
        <Empty>No invoices recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Received</th>
                <th className="right">Amount</th>
                <th className="right">Paid</th>
                <th className="right">Payments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.invoiceNumber}</td>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.receivedOn} /></td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td className="right"><MoneyLabel amountMinor={r.paidMinor} currency={r.currency} /></td>
                  <td className="right mono">{r.paymentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
