import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireRoles } from '@/interfaces/ui/auth';
import { listCommittees, listUsersForPicker } from '@/interfaces/ui/views/GovernanceViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';
import { CommitteeMembershipActions } from './CommitteeMembershipActions';

export const metadata = { title: 'Committees • Procurement' };
export const dynamic = 'force-dynamic';

export default async function CommitteesPage() {
  await requireRoles([Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N]);
  const [committees, users] = await Promise.all([listCommittees(), listUsersForPicker()]);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Committees</h1>
        <div className="grow" />
        <Link className="btn btn-primary" href="/governance/committees/new">+ Form committee</Link>
      </div>
      <p className="muted">PPRA Rule 48 — a Grievance Redressal Committee must have an <strong>odd</strong> number of members. Tender and Finance Evaluation Committees have no parity constraint.</p>

      {committees.length === 0 ? (
        <Empty>No committees recorded yet.</Empty>
      ) : (
        <div className="stack-md">
          {committees.map((c) => (
            <div key={c.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <h3 style={{ margin: 0 }}>{c.name}</h3>
                <div style={{ marginLeft: 10, display: 'inline-flex', gap: 6 }}>
                  <StatusPill tone="info">{c.kind}</StatusPill>
                  <StatusPill tone={c.isActive ? 'ok' : 'warn'}>{c.isActive ? 'Active' : 'Inactive'}</StatusPill>
                  {c.kind === 'GRC' && (
                    <StatusPill tone={c.activeMemberCount % 2 === 1 && c.activeMemberCount >= 1 ? 'ok' : 'danger'}>
                      {c.activeMemberCount} active member{c.activeMemberCount === 1 ? '' : 's'}
                      {c.activeMemberCount % 2 === 0 ? ' (even!)' : ''}
                    </StatusPill>
                  )}
                </div>
              </div>
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
                <dt className="muted">Term start</dt><dd><DateLabel iso={c.termStart} /></dd>
                <dt className="muted">Term end</dt><dd>{c.termEnd ? <DateLabel iso={c.termEnd} /> : <span className="muted">open-ended</span>}</dd>
              </dl>
              <table className="table" style={{ marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th>Left</th>
                  </tr>
                </thead>
                <tbody>
                  {c.members.map((m) => (
                    <tr key={m.id}>
                      <td>{m.userName ?? <span className="mono muted">{m.userId}</span>}</td>
                      <td>{m.memberRole}</td>
                      <td><DateLabel iso={m.joinedOn} /></td>
                      <td>{m.leftOn ? <DateLabel iso={m.leftOn} /> : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <CommitteeMembershipActions
                committeeId={c.id}
                isActive={c.isActive}
                members={c.members}
                users={users}
              />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
