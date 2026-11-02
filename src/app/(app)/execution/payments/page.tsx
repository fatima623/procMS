import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listPayments } from '@/interfaces/ui/views/WorkflowListViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Payments • Procurement' };
export const dynamic = 'force-dynamic';

export default async function PaymentsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listPayments();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Payments</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/execution/payments/new">+ Record payment</Link>
      </div>
      <p className="muted">Payment releases against invoices (DPP&amp;I-35 Chapter XIV). PFM Act §22 — payments within 30 days of accepted invoice.</p>

      {rows.length === 0 ? (
        <Empty>No payments recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Contract #</th>
                <th>Firm</th>
                <th>Paid on</th>
                <th className="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.invoiceNumber}</td>
                  <td className="mono"><Link href="/execution/contracts">{r.contractNumber}</Link></td>
                  <td>{r.firmName}</td>
                  <td><DateLabel iso={r.paidOn} /></td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
