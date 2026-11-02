'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function GrievanceActions({ id, status }: { readonly id: string; readonly status: string }) {
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

  function decide(verdict: 'UPHELD' | 'REJECTED') {
    const text = window.prompt(`GRC decision text (reasoning for ${verdict.toLowerCase()}):`);
    if (!text || text.trim().length < 10) return;
    return post(`/api/grievances/${id}/decide`, {
      decision: verdict,
      grcDecisionOn: new Date().toISOString().slice(0, 10),
      grcDecisionText: text,
    }, verdict);
  }
  function appeal() {
    return post(`/api/grievances/${id}/appeal`, { appealedToPPRAOn: new Date().toISOString().slice(0, 10) }, 'appeal');
  }
  function withdraw() {
    const r = window.prompt('Reason for withdrawal (optional):');
    return post(`/api/grievances/${id}/withdraw`, { reason: r ?? undefined }, 'withdraw');
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        {status === 'PENDING' && (
          <>
            <button className="btn btn-primary" onClick={() => decide('REJECTED')} disabled={busy !== null}>{busy === 'REJECTED' ? '…' : 'Reject'}</button>
            <button className="btn" onClick={() => decide('UPHELD')} disabled={busy !== null}>{busy === 'UPHELD' ? '…' : 'Uphold'}</button>
            <button className="btn" onClick={withdraw} disabled={busy !== null}>{busy === 'withdraw' ? '…' : 'Withdraw'}</button>
          </>
        )}
        {(status === 'REJECTED' || status === 'UPHELD') && (
          <button className="btn" onClick={appeal} disabled={busy !== null}>{busy === 'appeal' ? '…' : 'Mark appealed'}</button>
        )}
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
