import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { listInbox } from '@/interfaces/ui/views/MailViews';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';

export const metadata = { title: 'Inbox • Procurement' };
export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const { rows, unreadCount } = await listInbox(ctx.userId);
  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Inbox</h1>
        <span className="muted" style={{ marginLeft: 10 }}>{unreadCount} unread</span>
        <div className="grow" />
        <Link className="btn" href="/mail/sent">Sent</Link>
        <Link className="btn btn-primary" href="/mail/compose">+ Compose</Link>
      </div>

      {rows.length === 0 ? (
        <Empty>No messages yet.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>From</th>
                <th>Subject</th>
                <th>Received</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.readAt ? undefined : { fontWeight: 700 }}>
                  <td>{r.otherPartyName ?? '—'}</td>
                  <td><Link href={`/mail/${r.id}`}>{r.subject}</Link></td>
                  <td><DateLabel iso={r.sentAt} /></td>
                  <td>{r.readAt ? 'Read' : 'Unread'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
