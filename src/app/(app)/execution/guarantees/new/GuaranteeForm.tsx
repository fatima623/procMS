'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function GuaranteeForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [type, setType] = useState<'BID_SECURITY' | 'PERFORMANCE' | 'ADVANCE_PAYMENT'>('PERFORMANCE');
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState('PKR');
  const [furnishedOn, setFurnishedOn] = useState(new Date().toISOString().slice(0, 10));
  const [expiresOn, setExpiresOn] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/guarantees', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId,
          type,
          amount,
          currency,
          furnishedOn: furnishedOn || undefined,
          expiresOn: expiresOn || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/guarantees');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No contracts available. Award a contract first.</p>
        <Link className="btn" href="/execution/contracts">← Back to contracts</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="contractId">Contract</label>
        <select id="contractId" className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName} ({c.status})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="type">Guarantee type</label>
        <select id="type" className="select" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
          <option value="BID_SECURITY">Bid security</option>
          <option value="PERFORMANCE">Performance bond</option>
          <option value="ADVANCE_PAYMENT">Advance payment guarantee</option>
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="amount">Amount</label>
          <input id="amount" className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="furnishedOn">Furnished on (optional)</label>
          <input id="furnishedOn" className="input" type="date" value={furnishedOn} onChange={(e) => setFurnishedOn(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="expiresOn">Expires on (optional)</label>
          <input id="expiresOn" className="input" type="date" value={expiresOn} onChange={(e) => setExpiresOn(e.target.value)} />
        </div>
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/guarantees" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record guarantee'}</button>
      </div>
    </form>
  );
}
