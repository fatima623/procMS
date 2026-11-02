'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function ContractAmendmentForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [scope, setScope] = useState<'QTY' | 'DP' | 'VALUE' | 'SPEC' | 'OTHER'>('VALUE');
  const [summary, setSummary] = useState('');
  const [deltaValue, setDeltaValue] = useState('');
  const [deltaCurrency, setDeltaCurrency] = useState('PKR');
  const [requestedOn, setRequestedOn] = useState(new Date().toISOString().slice(0, 10));
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/contract-amendments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId,
          scope,
          summary,
          deltaValue: deltaValue || undefined,
          deltaCurrency: deltaValue ? deltaCurrency : undefined,
          requestedOn,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/governance/contract-amendments');
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

  const expectsDelta = scope === 'VALUE' || scope === 'QTY';
  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="contractId">Contract</label>
        <select id="contractId" className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName} ({c.status})</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="scope">Scope</label>
          <select id="scope" className="select" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
            <option value="VALUE">Value</option>
            <option value="QTY">Quantity</option>
            <option value="DP">Delivery period</option>
            <option value="SPEC">Specification</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="requestedOn">Requested on</label>
          <input id="requestedOn" className="input" type="date" value={requestedOn} onChange={(e) => setRequestedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="summary">Change summary</label>
        <textarea id="summary" className="input" rows={4} minLength={10} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} required />
      </div>
      {expectsDelta && (
        <div className="row" style={{ gap: 12 }}>
          <div className="field" style={{ flex: 2 }}>
            <label htmlFor="deltaValue">Delta value (signed; negative = reduction, blank = informational)</label>
            <input id="deltaValue" className="input" type="number" step="0.01" value={deltaValue} onChange={(e) => setDeltaValue(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="deltaCurrency">Delta currency</label>
            <input id="deltaCurrency" className="input" maxLength={3} value={deltaCurrency} onChange={(e) => setDeltaCurrency(e.target.value.toUpperCase())} />
          </div>
        </div>
      )}
      <div className="field">
        <label htmlFor="documentKey">Supporting document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/governance/contract-amendments" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Propose amendment'}</button>
      </div>
    </form>
  );
}
