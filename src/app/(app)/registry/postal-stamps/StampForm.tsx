'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Add a postal-stamp entry. With `correspondenceId` it is fixed to that letter
 * (detail page); otherwise an optional outward letter can be picked.
 */
export function StampForm(props: {
  readonly correspondenceId?: string;
  readonly outwardOptions?: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [linkTo, setLinkTo] = useState(props.correspondenceId ?? '');
  const [denomination, setDenomination] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [usedOn, setUsedOn] = useState(localToday);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/postal-stamps', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ correspondenceId: linkTo || undefined, denomination, quantity, usedOn }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setDenomination('');
      setQuantity('1');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {!props.correspondenceId && (
          <div className="field" style={{ margin: 0, minWidth: 280 }}>
            <label htmlFor="linkTo">Outward letter (optional)</label>
            <select id="linkTo" className="select" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
              <option value="">— Not linked —</option>
              {(props.outwardOptions ?? []).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="denomination">Denomination (PKR)</label>
          <input id="denomination" className="input" type="number" min="0.01" step="0.01" value={denomination} onChange={(e) => setDenomination(e.target.value)} required style={{ width: 150 }} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="quantity">Quantity</label>
          <input id="quantity" className="input" type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required style={{ width: 110 }} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="usedOn">Used on</label>
          <input id="usedOn" className="input" type="date" value={usedOn} onChange={(e) => setUsedOn(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Add stamp entry'}</button>
      </div>
    </form>
  );
}
