import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listITsAwaitingTSR } from '@/interfaces/ui/views/InspectorateViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'TSR queue • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  queue:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h10"/></svg>,
  wrench:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 7a4 4 0 11-5 5l-6 6 2 2 6-6a4 4 0 015-5l-2 2 1 1 1-1 1 1-1 1 1 1 1-1z"/></svg>,
  pause:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  envelope:<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
};

export default async function TSRQueuePage() {
  await requireRoles([Role.INSPECTORATE, Role.ADMIN]);
  const rows = await listITsAwaitingTSR();
  const started = rows.filter((r) => r.tsrId).length;
  const notStarted = rows.length - started;
  const totalOffers = rows.reduce((n, r) => n + r.offerCount, 0);
  return (
    <>
      <h1>TSR queue</h1>
      <p className="muted">Dispatched tenders awaiting technical scrutiny. Start a TSR from the matching indent's action panel.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.queue}    label="In queue"    value={rows.length}  sub="Dispatched tenders awaiting scrutiny" />
        <KpiCard accent="teal"    icon={ICON.wrench}   label="In progress" value={started}      sub="TSR already started" />
        <KpiCard accent="amber"   icon={ICON.pause}    label="Not started" value={notStarted}   sub="Awaiting first touch" />
        <KpiCard accent="emerald" icon={ICON.envelope} label="Total offers" value={totalOffers} sub="Across every tender in queue" />
      </section>

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
