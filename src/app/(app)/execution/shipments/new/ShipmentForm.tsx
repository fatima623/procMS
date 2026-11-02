'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ContractRef { readonly id: string; readonly contractNumber: string; readonly firmName: string; readonly status: string; }
interface InvoiceRef { readonly id: string; readonly invoiceNumber: string; readonly contractNumber: string; readonly firmName: string; }

export function ShipmentForm({ contracts, invoices }: { readonly contracts: readonly ContractRef[]; readonly invoices: readonly InvoiceRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [contractId, setContractId] = useState(contracts[0]?.id ?? '');
  const [invoiceId, setInvoiceId] = useState('');
  const [mode, setMode] = useState<'SEA' | 'AIR' | 'ROAD' | 'RAIL' | 'COURIER'>('SEA');
  const [blAwbNumber, setBlAwbNumber] = useState('');
  const [dispatchedOn, setDispatchedOn] = useState(new Date().toISOString().slice(0, 10));
  const [receivedOn, setReceivedOn] = useState('');
  const [freightForwarder, setFreightForwarder] = useState('');
  const [originPort, setOriginPort] = useState('');
  const [destinationPort, setDestinationPort] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contractId,
          invoiceId: invoiceId || undefined,
          mode,
          blAwbNumber,
          dispatchedOn,
          receivedOn: receivedOn || undefined,
          freightForwarder: freightForwarder || undefined,
          originPort: originPort || undefined,
          destinationPort: destinationPort || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/shipments');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (contracts.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No contracts available.</p>
        <Link className="btn" href="/execution/contracts">← Back</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="contractId">Contract</label>
          <select id="contractId" className="select" value={contractId} onChange={(e) => setContractId(e.target.value)}>
            {contracts.map((c) => <option key={c.id} value={c.id}>{c.contractNumber} — {c.firmName}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="invoiceId">Invoice (optional)</label>
          <select id="invoiceId" className="select" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
            <option value="">— none —</option>
            {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoiceNumber} — {i.firmName}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="mode">Mode</label>
          <select id="mode" className="select" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="SEA">Sea</option>
            <option value="AIR">Air</option>
            <option value="ROAD">Road</option>
            <option value="RAIL">Rail</option>
            <option value="COURIER">Courier</option>
          </select>
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="blAwbNumber">BL / AWB number</label>
          <input id="blAwbNumber" className="input" value={blAwbNumber} onChange={(e) => setBlAwbNumber(e.target.value)} maxLength={80} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="dispatchedOn">Dispatched on</label>
          <input id="dispatchedOn" className="input" type="date" value={dispatchedOn} onChange={(e) => setDispatchedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="receivedOn">Received on (optional)</label>
          <input id="receivedOn" className="input" type="date" value={receivedOn} onChange={(e) => setReceivedOn(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="freightForwarder">Freight forwarder (optional)</label>
        <input id="freightForwarder" className="input" value={freightForwarder} onChange={(e) => setFreightForwarder(e.target.value)} maxLength={255} />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="originPort">Origin port</label>
          <input id="originPort" className="input" value={originPort} onChange={(e) => setOriginPort(e.target.value)} maxLength={120} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="destinationPort">Destination port</label>
          <input id="destinationPort" className="input" value={destinationPort} onChange={(e) => setDestinationPort(e.target.value)} maxLength={120} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Shipping document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/shipments" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record shipment'}</button>
      </div>
    </form>
  );
}
