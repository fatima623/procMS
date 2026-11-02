'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InvoiceRef {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly contractNumber: string;
  readonly firmName: string;
  readonly amountMinor: string;
  readonly currency: string;
}

export function PaymentForm({ invoices }: { readonly invoices: readonly InvoiceRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState(invoices[0]?.id ?? '');
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('0.00');
  const [currency, setCurrency] = useState(invoices[0]?.currency ?? 'PKR');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoiceId, paidOn, amount, currency }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/payments');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (invoices.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No invoices available. Record an invoice first.</p>
        <Link className="btn" href="/execution/invoices">← Back to invoices</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="invoiceId">Invoice</label>
        <select id="invoiceId" className="select" value={invoiceId} onChange={(e) => { setInvoiceId(e.target.value); const inv = invoices.find((i) => i.id === e.target.value); if (inv) setCurrency(inv.currency); }}>
          {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {i.firmName} ({i.contractNumber})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="paidOn">Paid on</label>
        <input id="paidOn" className="input" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} required />
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
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/payments" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record payment'}</button>
      </div>
    </form>
  );
}
