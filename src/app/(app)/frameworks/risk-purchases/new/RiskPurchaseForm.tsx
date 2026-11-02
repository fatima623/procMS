'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function RiskPurchaseForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [originalContractId, setOriginalContractId] = useState(contracts[0]?.id ?? '');
  const [triggerReason, setTriggerReason] = useState('');
  const [initiatedOn, setInitiatedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/risk-purchases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ originalContractId, triggerReason, initiatedOn, notes: notes || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/frameworks/risk-purchases');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No contracts available.</p>
        <Link className="btn" href="/execution/contracts">← Back</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="originalContractId">Original (defaulting) contract</label>
        <select id="originalContractId" className="select" value={originalContractId} onChange={(e) => setOriginalContractId(e.target.value)}>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName} ({c.status})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="initiatedOn">Initiated on</label>
        <input id="initiatedOn" className="input" type="date" value={initiatedOn} onChange={(e) => setInitiatedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="triggerReason">Trigger reason</label>
        <textarea id="triggerReason" className="input" rows={4} minLength={10} maxLength={5000} value={triggerReason} onChange={(e) => setTriggerReason(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/frameworks/risk-purchases" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Open case'}</button>
      </div>
    </form>
  );
}
