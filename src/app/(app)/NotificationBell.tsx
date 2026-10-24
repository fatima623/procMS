'use client';
import { useEffect, useState } from 'react';

/**
 * Header bell. Polls the unread count every 60s. Click opens a lightweight
 * dropdown with the latest ten; "See all" links to /notifications.
 */
interface Notif {
  readonly id: string;
  readonly type: string;
  readonly title: string;
  readonly body: string | null;
  readonly href: string | null;
  readonly readAt: string | null;
  readonly createdAt: string;
}

export function NotificationBell() {
  const [unread, setUnread] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(false);

  async function refreshCount() {
    try {
      const res = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setUnread(data?.data?.unread ?? 0);
    } catch { /* ignore */ }
  }

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?page=1', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data?.data?.items ?? []);
    } finally { setLoading(false); }
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    setUnread(0);
    await loadItems();
  }

  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (open) loadItems();
  }, [open]);

  // Click-outside to close.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-bell-root]')) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div data-bell-root style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setOpen((o) => !o)}
        aria-label={`${unread} unread notifications`}
        style={{ padding: '6px 10px', position: 'relative' }}
      >
        🔔
        {unread > 0 && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 2, right: 2,
              background: 'var(--danger)',
              color: '#fff',
              borderRadius: 999,
              padding: '0 5px',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '14px',
              minWidth: 14,
              textAlign: 'center',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 6,
            width: 340,
            maxHeight: 420,
            overflowY: 'auto',
            background: 'var(--bg-raised)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
            zIndex: 100,
          }}
        >
          <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
            <strong>Notifications</strong>
            <div className="grow" />
            {unread > 0 && <button className="btn btn-ghost" style={{ fontSize: 12, padding: '4px 8px' }} onClick={markAllRead}>Mark all read</button>}
          </div>
          {loading ? (
            <div className="muted" style={{ padding: 14, fontSize: 13 }}>Loading…</div>
          ) : items.length === 0 ? (
            <div className="muted" style={{ padding: 14, fontSize: 13 }}>No notifications.</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {items.map((n) => (
                <li key={n.id} style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--border)',
                  background: n.readAt ? 'transparent' : 'var(--bg-hover)',
                }}>
                  {n.href ? (
                    <a href={n.href} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 600 }}
                      onClick={() => fetch(`/api/notifications/${n.id}/read`, { method: 'POST' })}>
                      {n.title}
                    </a>
                  ) : <span style={{ fontWeight: 600 }}>{n.title}</span>}
                  {n.body && <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{n.body}</div>}
                  <div className="muted mono" style={{ fontSize: 10, marginTop: 4 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
          <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
            <a href="/notifications" className="muted" style={{ fontSize: 12 }}>See all →</a>
          </div>
        </div>
      )}
    </div>
  );
}
