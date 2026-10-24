'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

function toMinor(decimal: string): string {
  if (!/^\d+(\.\d{1,4})?$/.test(decimal)) throw new Error(`Invalid decimal: ${decimal}`);
  const [intPart, fracPartRaw = ''] = decimal.split('.');
  const fracPart = (fracPartRaw + '0000').slice(0, 4);
  return (BigInt(intPart ?? '0') * 10_000n + BigInt(fracPart || '0')).toString();
}

export function NewCommercialForm({
  indentId,
  itPerformaId,
  eligibleFirms,
}: {
  readonly indentId: string;
  readonly itPerformaId: string;
  readonly eligibleFirms: readonly { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [firmId, setFirmId] = useState(eligibleFirms[0]?.id ?? '');
  const [totalPrice, setTotalPrice] = useState('0.00');
  const [currency, setCurrency] = useState('PKR');
  const [deliveryWeeks, setDeliveryWeeks] = useState('8');
  const [documentKey, setDocumentKey] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/commercial-offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          itPerformaId,
          firmId,
          totalPriceMinor: toMinor(totalPrice),
          currency,
          deliveryWeeks: Number(deliveryWeeks) || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push(`/indents/${indentId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (eligibleFirms.length === 0) {
    return <div className="empty">All technically-accepted firms have had their commercial envelope opened.</div>;
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="field">
          <label>Firm</label>
          <select className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)} required>
            {eligibleFirms.map((f) => <option key={f.id} value={f.id}>{f.code} — {f.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Total price</label>
            <input className="input" type="number" min={0} step="0.0001" value={totalPrice} onChange={(e) => setTotalPrice(e.target.value)} required />
          </div>
          <div className="field">
            <label>Currency</label>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
          <div className="field">
            <label>Delivery (weeks)</label>
            <input className="input" type="number" min={0} value={deliveryWeeks} onChange={(e) => setDeliveryWeeks(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>Document reference (optional)</label>
          <input className="input mono" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} placeholder="s3://procurement/offers/…" />
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Opening…' : 'Open offer'}</button></div>
    </form>
  );
}
