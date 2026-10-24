import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { notificationService } from '@/application/notification/NotificationService';
import { Empty } from '@/interfaces/ui/components/Empty';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Pager } from '@/interfaces/ui/components/Pager';
import { MarkAllReadButton } from './MarkAllReadButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Notifications • Procurement' };

export default async function NotificationsPage({ searchParams }: { searchParams: { page?: string; unread?: string } }) {
  const ctx = await requireSessionCtx();
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const onlyUnread = searchParams.unread === '1';
  const result = await notificationService.listMine(ctx, { page, onlyUnread });

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Notifications</h1>
        <div className="grow" />
        <Link className="btn" href={{ pathname: '/notifications', query: onlyUnread ? {} : { unread: '1' } }}>
          {onlyUnread ? 'Show all' : 'Only unread'}
        </Link>
        {result.unreadCount > 0 && <MarkAllReadButton unreadCount={result.unreadCount} />}
      </div>

      {result.items.length === 0 ? (
        <Empty>No notifications{onlyUnread ? ' (unread)' : ''}.</Empty>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {result.items.map((n) => (
              <li key={n.id} style={{
                padding: '12px 16px',
                borderBottom: '1px solid var(--border)',
                background: n.readAt ? 'transparent' : 'var(--bg-hover)',
              }}>
                <div className="row">
                  {n.href ? (
                    <a href={n.href} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}>{n.title}</a>
                  ) : <strong>{n.title}</strong>}
                  <div className="grow" />
                  <span className="muted mono" style={{ fontSize: 11 }}><DateLabel iso={n.createdAt} /></span>
                </div>
                {n.body && <div className="muted" style={{ marginTop: 4 }}>{n.body}</div>}
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{n.type}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Pager pathname="/notifications" page={result.page} pageSize={result.pageSize} total={result.total} searchParams={searchParams as Record<string, string | undefined>} />
    </>
  );
}
