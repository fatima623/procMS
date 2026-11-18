import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { telephoneBillService } from '@/infrastructure/admin/TelephoneBillService';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MarkPaidButton } from './MarkPaidButton';

export const metadata = { title: 'Telephone Bills • Admin' };
export const dynamic = 'force-dynamic';

export default async function TelephoneBillsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  await requireSessionCtx();
  const sp = await searchParams;
  const paidFilter =
    sp.paid === 'true' ? true : sp.paid === 'false' ? false : undefined;

  const bills = await telephoneBillService.list(
    paidFilter !== undefined ? { paid: paidFilter } : undefined,
  );

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Telephone Bills</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Monthly telephone bill register (ProcMS v4.4.1 manual pp. 243–246).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/admin/telephone-bills/new">
          + Add Bill
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/admin/telephone-bills"
          className={`btn ${paidFilter === undefined ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        <Link
          href="/admin/telephone-bills?paid=false"
          className={`btn ${paidFilter === false ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          Unpaid
        </Link>
        <Link
          href="/admin/telephone-bills?paid=true"
          className={`btn ${paidFilter === true ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          Paid
        </Link>
      </div>

      {bills.length === 0 ? (
        <Empty>No telephone bills found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Phone Number</th>
              <th>Bill Month</th>
              <th className="right">Amount</th>
              <th>Due Date</th>
              <th>Entered By</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((b) => (
              <tr key={b.id}>
                <td className="mono">{b.phoneNumber}</td>
                <td>{b.billMonth}</td>
                <td className="mono right">
                  <MoneyLabel amountMinor={b.billAmountMinor} currency={b.currency} />
                </td>
                <td><DateLabel iso={b.dueDate} /></td>
                <td>{b.enteredBy.displayName}</td>
                <td>
                  {b.paidOn ? (
                    <span style={{ color: 'var(--ok)', fontSize: 13 }}>Paid</span>
                  ) : (
                    <span style={{ color: 'var(--danger)', fontSize: 13 }}>Unpaid</span>
                  )}
                </td>
                <td className="right">
                  <MarkPaidButton bill={{ ...b, billAmountMinor: b.billAmountMinor }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
