'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function DPExtensionForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [newDP, setNewDP] = useState('');
  const [reason, setReason] = useState('');
  const [grantedOn, setGrantedOn] = useState(new Date().toISOString().slice(0, 10));
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/dp-extensions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contractId, newDP, reason, grantedOn, documentKey: documentKey || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/dp-extensions');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No contracts available.</p>
        <Link className="btn" href="/execution/contracts">← Back to contracts</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="contractId">Contract</label>
        <select id="contractId" className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="newDP">New delivery period</label>
          <input id="newDP" className="input" type="date" value={newDP} onChange={(e) => setNewDP(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="grantedOn">Granted on</label>
          <input id="grantedOn" className="input" type="date" value={grantedOn} onChange={(e) => setGrantedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="reason">Reason for extension</label>
        <textarea id="reason" className="input" rows={4} minLength={10} maxLength={5000} value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Signed-order document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/dp-extensions" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Extend DP'}</button>
      </div>
    </form>
  );
}
