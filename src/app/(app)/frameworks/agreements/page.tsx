import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listFrameworks } from '@/interfaces/ui/views/FrameworkViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { FrameworkActions } from './FrameworkActions';

export const metadata = { title: 'Framework agreements • Procurement' };
export const dynamic = 'force-dynamic';

export default async function FrameworksPage() {
  await requireRoles([Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listFrameworks();
  const now = Date.now();
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Framework agreements</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/frameworks/agreements/new">+ New framework</Link>
      </div>
      <p className="muted">DPP&amp;I-35 Ch XXIII — pre-negotiated agreements with one or more firms at agreed prices. OPEN frameworks re-open for mini-competitions; CLOSED ones place call-offs at fixed prices.</p>

      {rows.length === 0 ? (
        <Empty>No framework agreements recorded yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Name</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Valid</th>
                <th className="right">Max value</th>
                <th className="right">Firms / Call-offs</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const expired = r.status === 'ACTIVE' && new Date(r.validTo).getTime() < now;
                return (
                  <tr key={r.id}>
                    <td className="mono">{r.reference}</td>
                    <td>{r.name}</td>
                    <td><StatusPill tone="info">{r.kind}</StatusPill></td>
                    <td>
                      <StatusPill tone={r.status === 'ACTIVE' ? (expired ? 'warn' : 'ok') : r.status === 'TERMINATED' ? 'danger' : 'info'}>
                        {expired ? 'ACTIVE (lapsed)' : r.status}
                      </StatusPill>
                    </td>
                    <td><DateLabel iso={r.validFrom} /> → <DateLabel iso={r.validTo} /></td>
                    <td className="right">
                      {r.maxValueMinor
                        ? <MoneyLabel amountMinor={r.maxValueMinor} currency={r.currency} />
                        : <span className="muted">—</span>}
                    </td>
                    <td className="right mono">{r.firmCount} / {r.callOffCount}</td>
                    <td className="right"><FrameworkActions id={r.id} status={r.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
