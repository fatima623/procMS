import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listPendingApprovals } from '@/interfaces/ui/views/ApprovalViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel, MoneyCompact } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { KpiCard } from '@/interfaces/ui/components/KpiCard';

export const metadata = { title: 'My approvals • Procurement' };
export const dynamic = 'force-dynamic';

const ICON = {
  inbox:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>,
  spark:   <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z"/></svg>,
  hourglass: <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12M6 22h12M6 2v4l6 6-6 6v4M18 2v4l-6 6 6 6v4"/></svg>,
  wallet:  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="14" rx="2"/><path d="M16 13h3"/><path d="M3 10h18"/></svg>,
};

export default async function ApprovalsPage() {
  const ctx = await requireSessionCtx();
  const rows = await listPendingApprovals(ctx);
  const isAdmin = ctx.roles.includes(Role.ADMIN);

  // Derive summary stats from the already-loaded rows (no extra query).
  const now = Date.now();
  const DAY = 24 * 3600 * 1000;
  let fresh = 0, aging = 0, overdue = 0;
  let valueSum = 0n;
  const bySubject = { INDENT: 0, IT_PROFORMA: 0, CST: 0 } as Record<string, number>;
  for (const r of rows) {
    const age = now - new Date(r.createdAt).getTime();
    if (age < DAY) fresh += 1;
    else if (age < 3 * DAY) aging += 1;
    else overdue += 1;
    bySubject[r.subject] = (bySubject[r.subject] ?? 0) + 1;
    if (r.indentValueMinor) valueSum += BigInt(r.indentValueMinor);
  }
  const subjectLine = [`${bySubject.INDENT ?? 0} indent`, `${bySubject.IT_PROFORMA ?? 0} IT`, `${bySubject.CST ?? 0} CST`].join(' · ');

  return (
    <>
      <h1>{isAdmin ? 'Pending approvals (all roles)' : 'My approvals'}</h1>
      <p className="muted">
        {isAdmin
          ? 'Admin oversight: every chain step currently waiting for a decision, across every role.'
          : 'Steps where your role is the current actor. Decide to advance the chain, reject to end it, or return for rework.'}
      </p>

      {/* KPI summary strip */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 14, marginBottom: 18 }}>
        <KpiCard accent="indigo"  icon={ICON.inbox}     label="In your queue"   value={rows.length}   sub={subjectLine} />
        <KpiCard accent="emerald" icon={ICON.spark}     label="Fresh (<24h)"    value={fresh}         sub="Act quickly to stay in SLA" />
        <KpiCard accent="amber"   icon={ICON.hourglass} label="Aging (1–3 d)"   value={aging}         sub="Running down the clock" />
        <KpiCard accent="coral"   icon={ICON.wallet}    label="Value at stake"
          value={<MoneyCompact amountMinor={valueSum.toString()} currency="PKR" precision={2} />}
          sub={overdue > 0 ? `${overdue} over 3 days — act now` : 'All within 3-day window'}
        />
      </section>

      {rows.length === 0 ? (
        <Empty>Nothing is waiting right now.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Subject</th>
                <th>Indent</th>
                <th className="right">Value</th>
                <th>Opened</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.stepId}>
                  <td><StatusPill tone="info">{r.role}</StatusPill></td>
                  <td className="mono">{r.subject.replace('_', ' ')}</td>
                  <td>
                    {r.indentNumber ? (
                      <>
                        <Link className="mono" href={`/indents/${r.indentId}`}>{r.indentNumber}</Link>
                        <div className="muted" style={{ fontSize: 12 }}>{r.indentSubject}</div>
                      </>
                    ) : <span className="muted">—</span>}
                  </td>
                  <td className="right">
                    {r.indentValueMinor && r.indentCurrency ? (
                      <MoneyLabel amountMinor={r.indentValueMinor} currency={r.indentCurrency} />
                    ) : <span className="muted">—</span>}
                  </td>
                  <td><DateLabel iso={r.createdAt} /></td>
                  <td className="right"><Link className="btn" href={`/approvals/${r.chainId}`}>{isAdmin ? 'View →' : 'Decide →'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAdmin && (
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          As admin you can see every pending step but typically delegate the decision. Decide-in-place still works when needed; the audit log records the admin-override.
        </p>
      )}
    </>
  );
}
