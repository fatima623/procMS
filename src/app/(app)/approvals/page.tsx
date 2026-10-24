import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listPendingApprovals } from '@/interfaces/ui/views/ApprovalViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const metadata = { title: 'My approvals • Procurement' };
export const dynamic = 'force-dynamic';

export default async function ApprovalsPage() {
  const ctx = await requireSessionCtx();
  const rows = await listPendingApprovals(ctx);
  const isAdmin = ctx.roles.includes(Role.ADMIN);
  return (
    <>
      <h1>{isAdmin ? 'Pending approvals (all roles)' : 'My approvals'}</h1>
      <p className="muted">
        {isAdmin
          ? 'Admin oversight: every chain step currently waiting for a decision, across every role.'
          : 'Steps where your role is the current actor. Decide to advance the chain, reject to end it, or return for rework.'}
      </p>

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
