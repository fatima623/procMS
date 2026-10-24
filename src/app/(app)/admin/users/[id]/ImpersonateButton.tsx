'use client';
import { useState } from 'react';

export function ImpersonateButton({
  userId, email, isSelf,
}: {
  readonly userId: string;
  readonly email: string;
  readonly isSelf: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (!confirm(
      `Impersonate ${email}?\n\n` +
      `You'll see the app exactly as they do for the next hour.\n` +
      `Every action you take is recorded in the audit log under your real admin identity.`,
    )) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      window.location.href = '/dashboard';
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (isSelf) return null;
  return (
    <section className="card" style={{ background: 'rgba(210, 153, 34, 0.08)', borderColor: 'rgba(210, 153, 34, 0.4)' }}>
      <div className="row" style={{ gap: 10 }}>
        <div style={{ flex: 1 }}>
          <strong>Impersonate this user</strong>
          <div className="muted" style={{ fontSize: 12 }}>
            Useful when debugging a user-reported issue. One-hour window. Fully audited.
          </div>
        </div>
        {err && <div className="err" style={{ margin: 0 }}>{err}</div>}
        <button className="btn" onClick={run} disabled={busy}>
          {busy ? 'Starting…' : `Impersonate ${email} →`}
        </button>
      </div>
    </section>
  );
}
