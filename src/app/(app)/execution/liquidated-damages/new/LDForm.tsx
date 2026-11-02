'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function LDForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [assessedOn, setAssessedOn] = useState(new Date().toISOString().slice(0, 10));
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [basis, setBasis] = useState<'PER_DAY' | 'PER_WEEK' | 'PER_MONTH' | 'LUMP_SUM'>('PER_MONTH');
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState('PKR');
  const [waivedAmount, setWaivedAmount] = useState('');
  const [waivedReason, setWaivedReason] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/liquidated-damages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId,
          assessedOn,
          periodFrom,
          periodTo,
          basis,
          amount,
          currency,
          waivedAmount: waivedAmount || undefined,
          waivedReason: waivedReason || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/liquidated-damages');
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
          <label htmlFor="assessedOn">Assessed on</label>
          <input id="assessedOn" className="input" type="date" value={assessedOn} onChange={(e) => setAssessedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="periodFrom">Delay from</label>
          <input id="periodFrom" className="input" type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="periodTo">Delay to</label>
          <input id="periodTo" className="input" type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="basis">Basis</label>
          <select id="basis" className="select" value={basis} onChange={(e) => setBasis(e.target.value as typeof basis)}>
            <option value="PER_MONTH">Per month</option>
            <option value="PER_WEEK">Per week</option>
            <option value="PER_DAY">Per day</option>
            <option value="LUMP_SUM">Lump sum</option>
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="amount">LD amount</label>
          <input id="amount" className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="waivedAmount">Waived amount (optional)</label>
          <input id="waivedAmount" className="input" type="number" min="0" step="0.01" value={waivedAmount} onChange={(e) => setWaivedAmount(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="waivedReason">Waiver reason</label>
          <input id="waivedReason" className="input" value={waivedReason} onChange={(e) => setWaivedReason(e.target.value)} maxLength={2000} />
        </div>
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/liquidated-damages" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Assess LD'}</button>
      </div>
    </form>
  );
}
