'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RevokeBlacklistButton({ id }: { readonly id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function revoke() {
    const revokedReason = window.prompt('Reason for revoking this blacklist (minimum 5 characters):');
    if (!revokedReason || revokedReason.trim().length < 5) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/blacklists/${id}/revoke`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revokedOn: new Date().toISOString().slice(0, 10), revokedReason }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button className="btn" onClick={revoke} disabled={busy}>{busy ? '…' : 'Revoke'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
