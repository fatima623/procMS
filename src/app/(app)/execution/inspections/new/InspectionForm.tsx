'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function InspectionForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [performedOn, setPerformedOn] = useState(new Date().toISOString().slice(0, 10));
  const [verdict, setVerdict] = useState<'ACCEPTED' | 'DISCREPANCY' | 'REJECTED'>('ACCEPTED');
  const [summary, setSummary] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/inspections', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contractId, performedOn, verdict, summary, documentKey: documentKey || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/inspections');
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
          <label htmlFor="performedOn">Performed on</label>
          <input id="performedOn" className="input" type="date" value={performedOn} onChange={(e) => setPerformedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="verdict">Verdict</label>
          <select id="verdict" className="select" value={verdict} onChange={(e) => setVerdict(e.target.value as typeof verdict)}>
            <option value="ACCEPTED">Accepted (clear)</option>
            <option value="DISCREPANCY">Discrepancy noted</option>
            <option value="REJECTED">Rejected (fails inspection)</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="summary">Inspection summary</label>
        <textarea id="summary" className="input" rows={4} minLength={5} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Inspection report document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/inspections" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record inspection'}</button>
      </div>
    </form>
  );
}
