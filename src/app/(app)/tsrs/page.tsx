import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listITsAwaitingTSR } from '@/interfaces/ui/views/InspectorateViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';

export const metadata = { title: 'TSR queue • Procurement' };
export const dynamic = 'force-dynamic';

export default async function TSRQueuePage() {
  await requireRoles([Role.INSPECTORATE, Role.ADMIN]);
  const rows = await listITsAwaitingTSR();
  return (
    <>
      <h1>TSR queue</h1>
      <p className="muted">Dispatched tenders awaiting technical scrutiny. Start a TSR from the matching indent's action panel.</p>

      {rows.length === 0 ? (
        <Empty>No tenders are currently awaiting TSR.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IT Reference</th>
                <th>Indent subject</th>
                <th className="right">Offers</th>
                <th>Dispatched</th>
                <th>TSR status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itId}>
                  <td className="mono">{r.reference}</td>
                  <td>{r.indentSubject}</td>
                  <td className="right mono">{r.offerCount}</td>
                  <td><DateLabel iso={r.dispatchedAt} /></td>
                  <td>{r.tsrStatus ? <StatusPill tone="info">{r.tsrStatus}</StatusPill> : <span className="muted">Not started</span>}</td>
                  <td className="right">
                    {r.tsrId
                      ? <Link className="btn" href={`/tsrs/${r.tsrId}`}>Open →</Link>
                      : <span className="muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
