'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }

export function LCForm({ contracts }: { readonly contracts: readonly ContractRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [lcNumber, setLcNumber] = useState('');
  const [openedOn, setOpenedOn] = useState(new Date().toISOString().slice(0, 10));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/lcs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contractId, lcNumber, openedOn: openedOn || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/lcs');
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
          {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="lcNumber">LC number</label>
        <input id="lcNumber" className="input" value={lcNumber} onChange={(e) => setLcNumber(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="openedOn">Opened on (optional)</label>
        <input id="openedOn" className="input" type="date" value={openedOn} onChange={(e) => setOpenedOn(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/lcs" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record LC'}</button>
      </div>
    </form>
  );
}
