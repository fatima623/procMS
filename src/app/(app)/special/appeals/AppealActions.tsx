'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AppealActions({ id, status }: { readonly id: string; readonly status: string }) {
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
  function decide(decision: 'UPHELD' | 'REJECTED') {
    const text = window.prompt(`Decision text (reasoning for ${decision.toLowerCase()}):`);
    if (!text || text.trim().length < 10) return;
    return post(`/api/appeals/${id}/decide`, {
      decision,
      decidedOn: new Date().toISOString().slice(0, 10),
      decisionText: text,
    }, decision);
  }
  function withdraw() {
    const reason = window.prompt('Reason for withdrawal (optional):');
    return post(`/api/appeals/${id}/withdraw`, { reason: reason ?? undefined }, 'withdraw');
  }

  if (status !== 'PENDING') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={() => decide('REJECTED')} disabled={busy !== null}>{busy === 'REJECTED' ? '…' : 'Reject'}</button>
        <button className="btn" onClick={() => decide('UPHELD')} disabled={busy !== null}>{busy === 'UPHELD' ? '…' : 'Uphold'}</button>
        <button className="btn" onClick={withdraw} disabled={busy !== null}>{busy === 'withdraw' ? '…' : 'Withdraw'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
