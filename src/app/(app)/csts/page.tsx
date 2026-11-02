import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listCSTs } from '@/interfaces/ui/views/WorkflowListViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Comparative Statements (CST) • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  table:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16"/><path d="M3 10h18M9 4v16"/></svg>,
  check:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  draft:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20l4-1 10-10-3-3L5 16z"/></svg>,
  warn:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 18h.01"/></svg>,
};

export default async function CSTsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listCSTs();
  const draft = rows.filter((r) => r.status === 'DRAFT').length;
  const inApproval = rows.filter((r) => r.status === 'IN_APPROVAL').length;
  const approved = rows.filter((r) => r.status === 'APPROVED').length;
  const singleQuote = rows.filter((r) => r.singleQuote).length;

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Comparative Statements (CST)</h1>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 13 }}>Prepare from an indent in COMMERCIAL_OPEN status</span>
      </div>
      <p className="muted">Price-comparison statement across technically accepted bids (Chapter X DPP&amp;I-35; PPRA Rule 30).</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.table} label="Total CSTs"  value={rows.length}  sub="Across all stages" />
        <KpiCard accent="amber"   icon={ICON.draft} label="Draft / in approval"  value={draft + inApproval} sub={`${draft} drafts, ${inApproval} in approval`} />
        <KpiCard accent="emerald" icon={ICON.check} label="Approved"  value={approved} sub="Ready for PR issue" />
        <KpiCard accent="coral"   icon={ICON.warn}  label="Single-quote cases" value={singleQuote} sub="Need full Chain #3 approval" />
      </section>

      {rows.length === 0 ? (
        <Empty>No CSTs prepared yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>IT Reference</th>
                <th>Indent</th>
                <th>Status</th>
                <th className="right">Lines</th>
                <th>Single quote?</th>
                <th>Has PR?</th>
                <th>Created</th>
                <th>Approved</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.itReference}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td><StatusPill tone={r.status === 'APPROVED' ? 'ok' : r.status === 'REJECTED' ? 'danger' : 'info'}>{r.status}</StatusPill></td>
                  <td className="right mono">{r.lineCount}</td>
                  <td>{r.singleQuote ? <StatusPill tone="warn">Single</StatusPill> : <span className="muted">No</span>}</td>
                  <td>{r.hasPR ? <StatusPill tone="ok">Yes</StatusPill> : <span className="muted">—</span>}</td>
                  <td><DateLabel iso={r.createdAt} /></td>
                  <td><DateLabel iso={r.approvedAt} /></td>
                  <td className="right"><Link className="btn" href={`/indents/${r.indentId}`}>Open indent →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
