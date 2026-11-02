'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LCRef { readonly id: string; readonly lcNumber: string; readonly contractNumber: string; }

export function LCAmendmentForm({ lcs, preselectLC }: { readonly lcs: readonly LCRef[]; readonly preselectLC: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [letterOfCreditId, setLCId] = useState(preselectLC);
  const [requestedOn, setRequestedOn] = useState(new Date().toISOString().slice(0, 10));
  const [finalizedOn, setFinalizedOn] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/lc-amendments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ letterOfCreditId, requestedOn, finalizedOn: finalizedOn || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/lc-amendments');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (lcs.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No LCs available. Record an LC first.</p>
        <Link className="btn" href="/execution/lcs">← Back to LCs</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="letterOfCreditId">Letter of Credit</label>
        <select id="letterOfCreditId" className="select" value={letterOfCreditId} onChange={(e) => setLCId(e.target.value)}>
          {lcs.map((l) => <option key={l.id} value={l.id}>{l.lcNumber} — {l.contractNumber}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="requestedOn">Requested on</label>
        <input id="requestedOn" className="input" type="date" value={requestedOn} onChange={(e) => setRequestedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="finalizedOn">Finalised with bank on (optional)</label>
        <input id="finalizedOn" className="input" type="date" value={finalizedOn} onChange={(e) => setFinalizedOn(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/lc-amendments" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record amendment'}</button>
      </div>
    </form>
  );
}
