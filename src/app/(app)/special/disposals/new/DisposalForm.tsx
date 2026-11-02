'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface LotDraft { lotNumber: number; description: string; reservePrice: string; }

const EMPTY_LOT = (n: number): LotDraft => ({ lotNumber: n, description: '', reservePrice: '' });

export function DisposalForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [kind, setKind] = useState<'AUCTION' | 'TENDER' | 'SCRAP_SALE' | 'TRANSFER'>('AUCTION');
  const [description, setDescription] = useState('');
  const [initiatedOn, setInitiatedOn] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('PKR');
  const [bidOpensOn, setBidOpensOn] = useState('');
  const [bidClosesOn, setBidClosesOn] = useState('');
  const [lots, setLots] = useState<LotDraft[]>([EMPTY_LOT(1)]);

  function updateLot(i: number, patch: Partial<LotDraft>) {
    setLots((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLot() { setLots((prev) => [...prev, EMPTY_LOT(prev.length + 1)]); }
  function removeLot(i: number) { setLots((prev) => prev.filter((_, idx) => idx !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/disposals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reference, kind, description, initiatedOn, currency,
          bidOpensOn: bidOpensOn || undefined,
          bidClosesOn: bidClosesOn || undefined,
          lots: lots.map((l) => ({
            lotNumber: l.lotNumber,
            description: l.description,
            reservePrice: l.reservePrice || undefined,
            currency,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/special/disposals');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 920 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="reference">Reference</label>
          <input id="reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} minLength={3} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="kind">Kind</label>
          <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="AUCTION">Auction</option>
            <option value="TENDER">Tender</option>
            <option value="SCRAP_SALE">Scrap sale</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea id="description" className="input" rows={3} minLength={5} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="initiatedOn">Initiated on</label>
          <input id="initiatedOn" className="input" type="date" value={initiatedOn} onChange={(e) => setInitiatedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="bidOpensOn">Bid opens on (optional)</label>
          <input id="bidOpensOn" className="input" type="date" value={bidOpensOn} onChange={(e) => setBidOpensOn(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="bidClosesOn">Bid closes on (optional)</label>
          <input id="bidClosesOn" className="input" type="date" value={bidClosesOn} onChange={(e) => setBidClosesOn(e.target.value)} />
        </div>
      </div>

      <h3 style={{ margin: '14px 0 6px' }}>Lots</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Lot #</th>
            <th>Description</th>
            <th>Reserve price (optional)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {lots.map((l, i) => (
            <tr key={i}>
              <td><input className="input" type="number" min={1} value={l.lotNumber} onChange={(e) => updateLot(i, { lotNumber: Number(e.target.value) })} /></td>
              <td><input className="input" value={l.description} onChange={(e) => updateLot(i, { description: e.target.value })} minLength={3} maxLength={500} required /></td>
              <td><input className="input" type="number" min="0" step="0.01" value={l.reservePrice} onChange={(e) => updateLot(i, { reservePrice: e.target.value })} /></td>
              <td className="right">
                {lots.length > 1 && <button type="button" className="btn" onClick={() => removeLot(i)}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row row-end" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={addLot}>+ Add lot</button>
      </div>

      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/special/disposals" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Create case'}</button>
      </div>
    </form>
  );
}
