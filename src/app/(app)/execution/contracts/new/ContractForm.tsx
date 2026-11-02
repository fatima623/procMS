'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PRRef {
  readonly id: string;
  readonly prNumber: string;
  readonly indentId: string;
  readonly indentSubject: string;
  readonly firmId: string;
  readonly firmName: string;
  readonly amountMinor: string;
  readonly currency: string;
}

function minorToMajor(minor: string): string {
  try {
    const n = BigInt(minor);
    const sign = n < 0n ? '-' : '';
    const abs = n < 0n ? -n : n;
    const major = (abs / 10_000n).toString();
    const frac = (abs % 10_000n).toString().padStart(4, '0').slice(0, 2);
    return `${sign}${major}.${frac}`;
  } catch {
    return '0.00';
  }
}

export function ContractForm({ prs, preselectPR }: { readonly prs: readonly PRRef[]; readonly preselectPR: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prId, setPRId] = useState(preselectPR);
  const pr = useMemo(() => prs.find((p) => p.id === prId), [prs, prId]);

  const [contractNumber, setContractNumber] = useState('');
  const [value, setValue] = useState(() => (pr ? minorToMajor(pr.amountMinor) : '0.00'));
  const [currency, setCurrency] = useState(() => pr?.currency ?? 'PKR');
  const [awardedOn, setAwardedOn] = useState(new Date().toISOString().slice(0, 10));
  const [signedOn, setSignedOn] = useState('');
  const [status, setStatus] = useState<'SIGNED' | 'IN_PROGRESS'>('SIGNED');

  function onPRChange(id: string) {
    setPRId(id);
    const next = prs.find((p) => p.id === id);
    if (next) {
      setValue(minorToMajor(next.amountMinor));
      setCurrency(next.currency);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (!pr) throw new Error('Pick a Purchase Requisition');
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId: pr.indentId,
          purchaseRequisitionId: pr.id,
          firmId: pr.firmId,
          contractNumber,
          value,
          currency,
          awardedOn,
          signedOn: signedOn || undefined,
          status,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/contracts');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (prs.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No Purchase Requisitions are awaiting a contract. Issue a PR first.</p>
        <Link className="btn" href="/prs">← Back to PRs</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="field">
        <label htmlFor="prId">Purchase Requisition</label>
        <select id="prId" className="select" value={prId} onChange={(e) => onPRChange(e.target.value)}>
          {prs.map((p) => <option key={p.id} value={p.id}>{p.prNumber} — {p.firmName} ({p.indentSubject})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="contractNumber">Contract number</label>
        <input id="contractNumber" className="input" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder={`C/${new Date().getUTCFullYear()}/00001`} required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="value">Value</label>
          <input id="value" className="input" type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="awardedOn">Awarded on</label>
          <input id="awardedOn" className="input" type="date" value={awardedOn} onChange={(e) => setAwardedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="signedOn">Signed on (optional)</label>
          <input id="signedOn" className="input" type="date" value={signedOn} onChange={(e) => setSignedOn(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="status">Status</label>
        <select id="status" className="select" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="SIGNED">SIGNED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
        </select>
      </div>

      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/contracts" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy || !pr}>{busy ? '…' : 'Award contract'}</button>
      </div>
    </form>
  );
}
