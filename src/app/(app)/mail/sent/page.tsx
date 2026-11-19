import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listSent } from '@/interfaces/ui/views/MailViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Sent mail • Procurement' };
export const dynamic = 'force-dynamic';

export default async function SentPage() {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const rows = await listSent(ctx.userId);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Sent mail</h1>
        <div className="grow" />
        <Link className="btn" href="/mail/inbox">← Inbox</Link>
        <Link className="btn btn-primary" href="/mail/compose">+ Compose</Link>
      </div>

      {rows.length === 0 ? (
        <Empty>You have not sent any messages.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>To</th>
                <th>Subject</th>
                <th>Sent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.otherPartyName ?? '—'}</td>
                  <td><Link href={`/mail/${r.id}`}>{r.subject}</Link></td>
                  <td><DateLabel iso={r.sentAt} /></td>
                  <td><StatusPill tone={r.readAt ? 'ok' : 'info'}>{r.readAt ? 'Read' : 'Unread'}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
