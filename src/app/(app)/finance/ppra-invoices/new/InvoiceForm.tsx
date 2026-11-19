'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function InvoiceForm({ itOptions }: { readonly itOptions: readonly { id: string; label: string }[] }) {
  const router = useRouter();
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedOn, setReceivedOn] = useState(localToday);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [itPerformaIds, setItPerformaIds] = useState<string[]>([]);
  const [documentKey, setDocumentKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string, on: boolean) {
    setItPerformaIds((cur) => (on ? [...cur, id] : cur.filter((x) => x !== id)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (itPerformaIds.length === 0) {
      setErr('Select at least one IT Proforma');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/ppra-invoices', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          receivedOn,
          amount,
          currency,
          itPerformaIds,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/finance/ppra-invoices');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="invoiceNumber">Invoice number</label>
          <input id="invoiceNumber" className="input mono" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="receivedOn">Received on</label>
          <input id="receivedOn" className="input" type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="amount">Amount</label>
          <input id="amount" className="input mono" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} pattern="\d{1,16}(\.\d{1,4})?" title="Digits only, up to 4 decimal places" placeholder="e.g. 15000.00" required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input mono" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} minLength={3} maxLength={3} required />
        </div>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0 }}>
        <legend>IT Proformas covered (at least one)</legend>
        {itOptions.length === 0 ? (
          <p className="muted">No IT Proformas exist yet.</p>
        ) : (
          <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--border, #ddd)', borderRadius: 6, padding: 8 }}>
            {itOptions.map((o) => (
              <div key={o.id} style={{ padding: '2px 0' }}>
                <input type="checkbox" id={`it-${o.id}`} checked={itPerformaIds.includes(o.id)} onChange={(e) => toggle(o.id, e.target.checked)} />{' '}
                <label htmlFor={`it-${o.id}`}>{o.label}</label>
              </div>
            ))}
          </div>
        )}
      </fieldset>
      <div className="field">
        <label htmlFor="documentKey">Scanned invoice reference (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/finance/ppra-invoices" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Save invoice'}</button>
      </div>
    </form>
  );
}
