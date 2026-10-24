import Link from 'next/link';
import { Role } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { redirect } from 'next/navigation';
import { listFirmInvites } from '@/interfaces/ui/views/FirmViews';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';

export const metadata = { title: 'IT invites • Procurement' };
export const dynamic = 'force-dynamic';

export default async function InvitesPage() {
  const ctx = await requireSessionCtx();
  if (!ctx.firmId && !ctx.roles.includes(Role.ADMIN)) redirect('/dashboard');
  const rows = ctx.firmId ? await listFirmInvites(ctx.firmId) : [];

  return (
    <>
      <h1>IT invites</h1>
      <p className="muted">Tenders your firm has been invited to.</p>
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
