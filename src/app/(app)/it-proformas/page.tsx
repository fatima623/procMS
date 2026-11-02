import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listITProformas } from '@/interfaces/ui/views/WorkflowListViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'IT Proformas • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  mail: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>,
  check: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  draft: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/></svg>,
  firms: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="7" r="4"/><circle cx="17" cy="10" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/></svg>,
};

export default async function ITProformasPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listITProformas();
  const draft = rows.filter((r) => r.status === 'DRAFT').length;
  const inApproval = rows.filter((r) => r.status === 'IN_APPROVAL').length;
  const dispatched = rows.filter((r) => r.status === 'DISPATCHED').length;
  const totalInvites = rows.reduce((n, r) => n + r.firmCount, 0);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>IT Proformas</h1>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 13 }}>Create from an indent in IT_PREPARATION status</span>
      </div>
      <p className="muted">Invitations to Tender (Chapter VI DPP&amp;I-35) dispatched to pre-qualified firms. Every IT belongs to one indent.</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo" icon={ICON.mail}  label="Total IT Proformas" value={rows.length} sub="Across all stages" />
        <KpiCard accent="amber"  icon={ICON.draft} label="Draft / In approval"  value={draft + inApproval} sub={`${draft} drafts, ${inApproval} in approval`} />
        <KpiCard accent="emerald" icon={ICON.check} label="Dispatched"  value={dispatched} sub="Sent to firms" />
        <KpiCard accent="teal"   icon={ICON.firms} label="Firm invites" value={totalInvites} sub="Total invitation count" />
      </section>

      {rows.length === 0 ? (
        <Empty>No IT Proformas yet. Create one from an indent in IT_PREPARATION status.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IT Reference</th>
                <th>Indent</th>
                <th>IT status</th>
                <th>Indent status</th>
                <th className="right">Firms</th>
                <th className="right">Tech / Comm</th>
                <th>Dispatched</th>
                <th>Closes</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.reference}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td><StatusPill tone="info">{r.status}</StatusPill></td>
                  <td><StatusPill tone="default">{r.indentStatus}</StatusPill></td>
                  <td className="right mono">{r.firmCount}</td>
                  <td className="right mono">{r.technicalOffers} / {r.commercialOffers}</td>
                  <td><DateLabel iso={r.dispatchedAt} /></td>
                  <td><DateLabel iso={r.closingAt} /></td>
                  <td className="right">
                    <Link className="btn" href={`/indents/${r.indentId}`}>Open indent →</Link>
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
