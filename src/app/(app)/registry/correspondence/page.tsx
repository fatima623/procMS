import Link from 'next/link';
import { requireRoles } from '@/interfaces/ui/auth';
import { REGISTRY_ROLES } from '@/infrastructure/registry/RegistryService';
import { listCorrespondence } from '@/interfaces/ui/views/RegistryViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Central Registry • Procurement' };
export const dynamic = 'force-dynamic';

export default async function CorrespondenceListPage({
  searchParams,
}: {
  searchParams: Promise<{ direction?: string; q?: string }>;
}) {
  await requireRoles(REGISTRY_ROLES);
  const sp = await searchParams;
  const rows = await listCorrespondence({ direction: sp.direction, q: sp.q });
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Central Registry — Mail Inward / Outward</h1>
        <div className="grow" />
        <Link className="btn" href="/registry/postal-stamps">Postal stamps</Link>
        <Link className="btn btn-primary" href="/registry/correspondence/new">+ New correspondence</Link>
      </div>
      <p className="muted">Every official letter received by or sent from DP(N). Each gets a control number; open a row to add minutes (IMF / EMF) or postal stamps.</p>

      <form method="get" className="row" style={{ gap: 8, marginBottom: 14 }}>
        <select name="direction" className="select" defaultValue={sp.direction ?? ''} style={{ width: 160 }}>
          <option value="">All directions</option>
          <option value="INWARD">Inward</option>
          <option value="OUTWARD">Outward</option>
        </select>
        <input className="input" name="q" placeholder="Search control no., subject, from, to" defaultValue={sp.q ?? ''} style={{ width: 320 }} />
        <button className="btn">Filter</button>
        {(sp.direction || sp.q) && <Link className="btn" href="/registry/correspondence">Clear</Link>}
      </form>

      {rows.length === 0 ? (
        <Empty>No correspondence on record{sp.direction || sp.q ? ' for this filter' : ''}.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Control no.</th>
                <th>Direction</th>
                <th>Subject</th>
                <th>From</th>
                <th>To</th>
                <th>Date</th>
                <th>Assigned to</th>
                <th>Minutes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono"><Link href={`/registry/correspondence/${r.id}`}>{r.controlNumber}</Link></td>
                  <td><StatusPill tone={r.direction === 'INWARD' ? 'info' : 'ok'}>{r.direction}</StatusPill></td>
                  <td style={{ maxWidth: 320 }}>{r.subject}</td>
                  <td>{r.fromParty}</td>
                  <td>{r.toParty}</td>
                  <td><DateLabel iso={r.receivedOrSentOn} /></td>
                  <td>{r.assignedToName ?? <span className="muted">—</span>}</td>
                  <td className="mono">{r.minuteCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
