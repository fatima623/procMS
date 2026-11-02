'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AmendmentActions({ id, status }: { readonly id: string; readonly status: string }) {
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

  function approve() {
    return post(`/api/contract-amendments/${id}/approve`, { approvedOn: new Date().toISOString().slice(0, 10) }, 'approve');
  }
  function reject() {
    const r = window.prompt('Reason for rejection (minimum 5 characters):');
    if (!r || r.trim().length < 5) return;
    return post(`/api/contract-amendments/${id}/reject`, { rejectionReason: r }, 'reject');
  }

  if (status !== 'PROPOSED') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={approve} disabled={busy !== null}>{busy === 'approve' ? '…' : 'Approve'}</button>
        <button className="btn" onClick={reject} disabled={busy !== null}>{busy === 'reject' ? '…' : 'Reject'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
