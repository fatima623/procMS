import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { loadMessageThread } from '@/interfaces/ui/views/MailViews';
import { mailBoxService } from '@/infrastructure/mail-box/MailBoxService';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { ReplyForm } from './ReplyForm';

export const metadata = { title: 'Message • Procurement' };
export const dynamic = 'force-dynamic';

export default async function MessagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireSessionCtx();
  if (ctx.firmId) redirect('/dashboard');
  const data = await loadMessageThread(id, ctx.userId);
  if (!data) notFound();
  const { message, thread } = data;
  if (message.fromUserId !== ctx.userId && message.toUserId !== ctx.userId) redirect('/mail/inbox');

  // Opening a message as its recipient marks it read.
  const justRead = message.toUserId === ctx.userId && !message.readAt;
  if (justRead) await mailBoxService.markRead(ctx, message.id);

  return (
    <>
      <div className="row" style={{ marginBottom: 6, gap: 12 }}>
        <Link href="/mail/inbox" className="muted">← Inbox</Link>
        <Link href="/mail/sent" className="muted">Sent</Link>
      </div>
      <h1 style={{ marginTop: 0 }}>{message.subject}</h1>

      {thread.map((m) => {
        const isCurrent = m.id === message.id;
        const readAt = isCurrent && justRead ? new Date().toISOString() : m.readAt;
        return (
          <section key={m.id} className="card" style={{ padding: 20, marginBottom: 12, ...(isCurrent ? { borderLeft: '3px solid currentColor' } : {}) }}>
            <table className="table">
              <tbody>
                <tr><th style={{ width: 160 }}>From</th><td>{m.fromName ?? '—'}</td></tr>
                <tr><th>To</th><td>{m.toName ?? '—'}</td></tr>
                <tr><th>Subject</th><td>{isCurrent ? m.subject : <Link href={`/mail/${m.id}`}>{m.subject}</Link>}</td></tr>
                <tr><th>Sent</th><td><DateLabel iso={m.sentAt} /></td></tr>
                <tr><th>Read</th><td>{readAt ? <DateLabel iso={readAt} /> : <span className="muted">Unread</span>}</td></tr>
              </tbody>
            </table>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 12 }}>{m.body}</div>
          </section>
        );
      })}

      <section className="card" style={{ padding: 20 }}>
        <h2 style={{ marginTop: 0 }}>Reply</h2>
        <ReplyForm messageId={message.id} />
      </section>
    </>
  );
}
