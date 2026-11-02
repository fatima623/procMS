'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function InsuranceForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [kind, setKind] = useState<'MARINE' | 'WAR_RISK' | 'TRANSIT' | 'COMPREHENSIVE' | 'OTHER'>('MARINE');
  const [policyNumber, setPolicyNumber] = useState('');
  const [insurer, setInsurer] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [coverFromDate, setCoverFromDate] = useState(today);
  const [coverToDate, setCoverToDate] = useState('');
  const [premium, setPremium] = useState('0.00');
  const [currency, setCurrency] = useState('PKR');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/insurances', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId, kind, policyNumber, insurer, coverFromDate, coverToDate, premium, currency,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/insurances');
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
        <label htmlFor="contractId">Contract</label>
        <select id="contractId" className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="kind">Kind</label>
          <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="MARINE">Marine</option>
            <option value="WAR_RISK">War risk</option>
            <option value="TRANSIT">Transit</option>
            <option value="COMPREHENSIVE">Comprehensive</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="policyNumber">Policy number</label>
          <input id="policyNumber" className="input" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="insurer">Insurer</label>
          <input id="insurer" className="input" value={insurer} onChange={(e) => setInsurer(e.target.value)} maxLength={255} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="coverFromDate">Cover from</label>
          <input id="coverFromDate" className="input" type="date" value={coverFromDate} onChange={(e) => setCoverFromDate(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="coverToDate">Cover to</label>
          <input id="coverToDate" className="input" type="date" value={coverToDate} onChange={(e) => setCoverToDate(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="premium">Premium</label>
          <input id="premium" className="input" type="number" min="0" step="0.01" value={premium} onChange={(e) => setPremium(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Policy document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/insurances" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record insurance'}</button>
      </div>
    </form>
  );
}
