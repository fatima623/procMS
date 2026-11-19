'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Option = { id: string; label: string };

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function AckForm(props: {
  readonly invoiceOptions: readonly Option[];
  readonly itOptions: readonly Option[];
  readonly preselectedInvoiceId: string;
}) {
  const router = useRouter();
  const [invoiceId, setInvoiceId] = useState(props.preselectedInvoiceId);
  const [itPerformaId, setItPerformaId] = useState('');
  const [receivedOn, setReceivedOn] = useState(localToday);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!invoiceId && !itPerformaId) {
      setErr('Link the acknowledgement to a PPRA invoice and/or an IT Proforma');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/dgprn-acknowledgements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoiceId || undefined,
          itPerformaId: itPerformaId || undefined,
          receivedOn,
          referenceNumber,
          remarks: remarks || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push(invoiceId ? `/finance/ppra-invoices/${invoiceId}` : '/finance/dgprn-acknowledgements');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="invoiceId">PPRA invoice (sent to DGPR(N) or paid)</label>
        <select id="invoiceId" className="select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
          <option value="">— None —</option>
          {props.invoiceOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="itPerformaId">IT Proforma (optional)</label>
        <select id="itPerformaId" className="select" value={itPerformaId} onChange={(e) => setItPerformaId(e.target.value)}>
          <option value="">— None —</option>
          {props.itOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="referenceNumber">DGPR(N) reference number</label>
          <input id="referenceNumber" className="input mono" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} maxLength={80} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="receivedOn">Received on</label>
          <input id="receivedOn" className="input" type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="remarks">Remarks (optional)</label>
        <textarea id="remarks" className="input" rows={3} maxLength={5000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/finance/dgprn-acknowledgements" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Save acknowledgement'}</button>
      </div>
    </form>
  );
}
