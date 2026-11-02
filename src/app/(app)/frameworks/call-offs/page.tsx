import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listCallOffs } from '@/interfaces/ui/views/FrameworkViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { CallOffActions } from './CallOffActions';

export const metadata = { title: 'Call-off orders • Procurement' };
export const dynamic = 'force-dynamic';

export default async function CallOffsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listCallOffs();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Call-off orders</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/frameworks/call-offs/new">+ Place call-off</Link>
      </div>
      <p className="muted">Orders placed under an ACTIVE framework agreement without running a fresh IT.</p>

      {rows.length === 0 ? (
        <Empty>No call-offs placed yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Call-off #</th>
                <th>Framework</th>
                <th>Firm</th>
                <th>Description</th>
                <th className="right">Amount</th>
                <th>Placed</th>
                <th>Fulfilled</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.callOffNumber}</td>
                  <td className="mono">{r.frameworkReference}</td>
                  <td>{r.firmName}</td>
                  <td style={{ maxWidth: 300 }}>{r.description}</td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.placedOn} /></td>
                  <td><DateLabel iso={r.fulfilledOn} /></td>
                  <td><StatusPill tone={r.status === 'FULFILLED' ? 'ok' : r.status === 'CANCELLED' ? 'danger' : 'info'}>{r.status}</StatusPill></td>
                  <td className="right"><CallOffActions id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
