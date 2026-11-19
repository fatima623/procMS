'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** PENDING → CLOSED / DISPOSED_OFF. Both are final. */
export function StatusActions({ caseId, caseNumber }: { readonly caseId: string; readonly caseNumber: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function change(status: 'CLOSED' | 'DISPOSED_OFF') {
    const label = status === 'CLOSED' ? 'Closed' : 'Disposed off';
    if (!window.confirm(`Mark case ${caseNumber} as ${label}? This is final — no further proceedings can be added.`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/court-cases/${caseId}/status`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
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
    <div style={{ marginTop: 12 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn" disabled={busy} onClick={() => change('CLOSED')}>Mark closed</button>
        <button type="button" className="btn" disabled={busy} onClick={() => change('DISPOSED_OFF')}>Mark disposed off</button>
      </div>
    </div>
  );
}
