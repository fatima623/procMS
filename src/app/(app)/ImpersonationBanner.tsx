'use client';
import { useState } from 'react';

/**
 * Sticky banner shown whenever the current session was forged by an admin
 * via impersonation. Prominent, warning-coloured, with a one-click way back.
 */
export function ImpersonationBanner({
  adminEmail,
  targetEmail,
}: {
  readonly adminEmail: string | null;
  readonly targetEmail: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function stop() {
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/impersonate/stop', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      // Hard reload so every server component picks up the restored session.
      window.location.href = '/dashboard';
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div
      role="alert"
      style={{
        position: 'sticky', top: 0, zIndex: 25,
        background: 'repeating-linear-gradient(45deg, #d29922, #d29922 10px, #b2810f 10px, #b2810f 20px)',
        color: '#0b1220', fontWeight: 600, fontSize: 13,
        padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 12,
      }}
    >
      <span>⚠ You are impersonating <strong>{targetEmail ?? 'another user'}</strong>{adminEmail ? ` as ${adminEmail}` : ''}. All actions are audited under your real admin identity.</span>
      <div style={{ flex: 1 }} />
      {err && <span style={{ color: '#8b0000' }}>{err}</span>}
      <button
        className="btn"
        onClick={stop}
        disabled={busy}
        style={{ background: '#0b1220', color: '#fff', border: '1px solid #0b1220' }}
      >
        {busy ? 'Restoring…' : 'Stop impersonating'}
      </button>
    </div>
  );
}
