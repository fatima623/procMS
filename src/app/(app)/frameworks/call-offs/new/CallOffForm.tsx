'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FrameworkOption {
  readonly id: string;
  readonly reference: string;
  readonly name: string;
  readonly currency: string;
  readonly firms: readonly { readonly id: string; readonly name: string }[];
}

export function CallOffForm({ frameworks }: { readonly frameworks: readonly FrameworkOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [frameworkAgreementId, setFrameworkId] = useState(frameworks[0]?.id ?? '');
  const selected = useMemo(() => frameworks.find((f) => f.id === frameworkAgreementId), [frameworks, frameworkAgreementId]);
  const [firmId, setFirmId] = useState(selected?.firms[0]?.id ?? '');
  const [callOffNumber, setCallOffNumber] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('0.00');
  const [placedOn, setPlacedOn] = useState(new Date().toISOString().slice(0, 10));
  const [documentKey, setDocumentKey] = useState('');

  function changeFramework(id: string) {
    setFrameworkId(id);
    const fw = frameworks.find((f) => f.id === id);
    setFirmId(fw?.firms[0]?.id ?? '');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (!selected) throw new Error('Pick a framework');
      const res = await fetch('/api/call-offs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          frameworkAgreementId, firmId, callOffNumber, description, amount,
          currency: selected.currency, placedOn,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/frameworks/call-offs');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (frameworks.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No ACTIVE frameworks available.</p>
        <Link className="btn" href="/frameworks/agreements">← Back to frameworks</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="frameworkAgreementId">Framework</label>
          <select id="frameworkAgreementId" className="select" value={frameworkAgreementId} onChange={(e) => changeFramework(e.target.value)}>
            {frameworks.map((f) => <option key={f.id} value={f.id}>{f.reference} — {f.name}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="firmId">Firm</label>
          <select id="firmId" className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
            {selected?.firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="callOffNumber">Call-off number</label>
          <input id="callOffNumber" className="input" value={callOffNumber} onChange={(e) => setCallOffNumber(e.target.value)} minLength={3} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="placedOn">Placed on</label>
          <input id="placedOn" className="input" type="date" value={placedOn} onChange={(e) => setPlacedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <input id="description" className="input" value={description} onChange={(e) => setDescription(e.target.value)} minLength={3} maxLength={500} required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="amount">Amount ({selected?.currency ?? ''})</label>
          <input id="amount" className="input" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Order document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/frameworks/call-offs" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Place call-off'}</button>
      </div>
    </form>
  );
}
