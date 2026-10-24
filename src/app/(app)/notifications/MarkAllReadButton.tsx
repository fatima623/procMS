'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client wrapper so the "Mark all read" POST goes through the browser's
 * fetch (which the Providers hook decorates with the CSRF header). A plain
 * <form action="…" method="post"> would be a cross-document POST and skip
 * the hook — which the CSRF middleware would correctly reject.
 */
export function MarkAllReadButton({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (res.ok) router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <button className="btn" onClick={run} disabled={busy}>
      {busy ? 'Marking…' : `Mark all read (${unreadCount})`}
    </button>
  );
}
