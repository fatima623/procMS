import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { redirect } from 'next/navigation';
import { listFirmInvites } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'IT invites • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  mail:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  bell:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  flame: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 20a6 6 0 0012 0c0-4-3-5-3-8 0-3-2-5-4-6 1 3-1 5-3 7-2 2-2 5 0 7-2 0-2-2-2-4"/></svg>,
};

export default async function InvitesPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmInvites(ctx.firmId) : [];
  const awaiting = rows.filter((r) => !r.alreadySubmitted).length;
  const submitted = rows.length - awaiting;
  const now = Date.now();
  const closingSoon = rows.filter((r) => !r.alreadySubmitted && r.closingAt && new Date(r.closingAt).getTime() - now < 48 * 3600 * 1000).length;

  return (
    <>
      <h1>IT invites</h1>
      <p className="muted">Tenders your firm has been invited to.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.mail}  label="Total invites"     value={rows.length} sub="Tenders you've been invited to" />
        <KpiCard accent="amber"   icon={ICON.bell}  label="Awaiting your offer" value={awaiting} sub="Action needed" />
        <KpiCard accent="emerald" icon={ICON.check} label="Offers submitted"   value={submitted} sub="Already in" />
        <KpiCard accent="coral"   icon={ICON.flame} label="Closing within 48h" value={closingSoon} sub={closingSoon > 0 ? 'Priority — don’t miss the window' : 'No tight deadlines'} />
      </section>

      {rows.length === 0 ? (
        <Empty>No open invites.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IT reference</th>
                <th>Subject</th>
                <th>Dispatched</th>
                <th>Offer deadline</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.itId}>
                  <td className="mono">{r.reference}</td>
                  <td>{r.indentSubject}</td>
                  <td><DateLabel iso={r.dispatchedAt} /></td>
                  <td><DateLabel iso={r.closingAt} /></td>
                  <td>{r.alreadySubmitted ? <StatusPill tone="ok">Offer submitted</StatusPill> : <StatusPill tone="warn">Awaiting offer</StatusPill>}</td>
                  <td className="right">
                    {r.alreadySubmitted
                      ? <span className="muted">—</span>
                      : <Link className="btn btn-primary" href={`/firm/invites/${r.itId}/offer`}>Submit offer →</Link>}
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
