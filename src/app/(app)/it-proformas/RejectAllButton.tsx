'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RejectAllButton({ itPerformaId }: { readonly itPerformaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const reason = window.prompt('Reason for rejecting all offers (minimum 10 characters, PPRA Rule 33):');
    if (!reason || reason.trim().length < 10) return;
    if (!window.confirm('Reject every technical and commercial offer on this IT and return the indent to IT_PREPARATION? This cannot be undone.')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/it-proformas/${itPerformaId}/reject-all`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
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
      <button className="btn btn-danger" onClick={run} disabled={busy}>{busy ? '…' : 'Reject all + re-bid'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
