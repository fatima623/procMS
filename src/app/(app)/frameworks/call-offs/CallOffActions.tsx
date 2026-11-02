'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CallOffActions({ id, status }: { readonly id: string; readonly status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  function fulfill() {
    return post(`/api/call-offs/${id}/fulfill`, { fulfilledOn: new Date().toISOString().slice(0, 10) }, 'fulfill');
  }
  function cancel() {
    const reason = window.prompt('Cancellation reason (minimum 5 characters):');
    if (!reason || reason.trim().length < 5) return;
    return post(`/api/call-offs/${id}/cancel`, { cancelledOn: new Date().toISOString().slice(0, 10), cancelledReason: reason }, 'cancel');
  }
  if (status === 'FULFILLED' || status === 'CANCELLED') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={fulfill} disabled={busy !== null}>{busy === 'fulfill' ? '…' : 'Fulfill'}</button>
        <button className="btn" onClick={cancel} disabled={busy !== null}>{busy === 'cancel' ? '…' : 'Cancel'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
