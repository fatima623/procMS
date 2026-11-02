import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listPRs } from '@/interfaces/ui/views/WorkflowListViews';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Purchase Requisitions • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  doc:    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></svg>,
  check:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4 4L19 6"/></svg>,
  wallet: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
  award:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M8 14l-2 7 6-4 6 4-2-7"/></svg>,
};

export default async function PRsPage() {
  await requireRoles([Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
  const rows = await listPRs();
  const draft = rows.filter((r) => r.status === 'DRAFT').length;
  const sent = rows.filter((r) => r.status === 'SENT' || r.status === 'ACKNOWLEDGED').length;
  const closed = rows.filter((r) => r.status === 'CLOSED').length;
  const totalMinor = rows.reduce((sum, r) => sum + BigInt(r.amountMinor), 0n);
  const withContract = rows.filter((r) => r.hasContract).length;

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Purchase Requisitions</h1>
        <div className="grow" />
        <span className="muted" style={{ fontSize: 13 }}>Issued from a CST after Chain #3 approval</span>
      </div>
      <p className="muted">Purchase Proposal / Award letter faxed to the winning firm (Chapter XI DPP&amp;I-35).</p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.doc}    label="Total PRs"  value={rows.length}  sub={`${draft} draft · ${sent} out · ${closed} closed`} />
        <KpiCard accent="emerald" icon={ICON.wallet} label="Combined value" value={<MoneyLabel amountMinor={totalMinor.toString()} currency="PKR" />} sub="Across all PRs" />
        <KpiCard accent="violet"  icon={ICON.award}  label="Awarded (has contract)" value={withContract} sub="Progressed to execution" />
        <KpiCard accent="sky"     icon={ICON.check}  label="Faxed / acknowledged" value={sent} sub="With firm" />
      </section>

      {rows.length === 0 ? (
        <Empty>No PRs issued yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>PR #</th>
                <th>Indent</th>
                <th>Firm</th>
                <th>Status</th>
                <th className="right">Amount</th>
                <th>Faxed</th>
                <th>Has contract?</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.prNumber}</td>
                  <td><Link href={`/indents/${r.indentId}`}>{r.indentSubject}</Link></td>
                  <td>{r.firmName}</td>
                  <td><StatusPill tone={r.status === 'CLOSED' ? 'ok' : r.status === 'ACKNOWLEDGED' ? 'info' : r.status === 'DRAFT' ? 'warn' : 'default'}>{r.status}</StatusPill></td>
                  <td className="right"><MoneyLabel amountMinor={r.amountMinor} currency={r.currency} /></td>
                  <td><DateLabel iso={r.faxedAt} /></td>
                  <td>{r.hasContract
                    ? <Link className="btn" href="/execution/contracts">View →</Link>
                    : <Link className="btn btn-primary" href={`/execution/contracts/new?prId=${r.id}`}>+ Award contract</Link>}</td>
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
