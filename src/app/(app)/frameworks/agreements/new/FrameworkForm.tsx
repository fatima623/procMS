'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FirmPick { readonly id: string; readonly name: string; readonly isBlacklisted: boolean; }

export function FrameworkForm({ firms }: { readonly firms: readonly FirmPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [kind, setKind] = useState<'OPEN' | 'CLOSED'>('CLOSED');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'GOODS' | 'WORKS' | 'SERVICES'>('GOODS');
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(nextYear);
  const [maxValue, setMaxValue] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [firmIds, setFirmIds] = useState<string[]>(firms[0]?.id ? [firms[0].id] : []);
  const [documentKey, setDocumentKey] = useState('');

  function toggleFirm(id: string) {
    setFirmIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/framework-agreements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          reference, kind, name, category, validFrom, validTo,
          maxValue: maxValue || undefined,
          currency, firmIds, documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/frameworks/agreements');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (firms.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No firms registered.</p>
        <Link className="btn" href="/admin/firms">← Back to firms</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 820 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="reference">Reference</label>
          <input id="reference" className="input" value={reference} onChange={(e) => setReference(e.target.value)} minLength={3} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="name">Name</label>
          <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={255} required />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="kind">Kind</label>
          <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="CLOSED">Closed (fixed-price)</option>
            <option value="OPEN">Open (re-opens for mini-competitions)</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="category">Category</label>
          <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
            <option value="GOODS">Goods</option>
            <option value="WORKS">Works</option>
            <option value="SERVICES">Services</option>
          </select>
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="validFrom">Valid from</label>
          <input id="validFrom" className="input" type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="validTo">Valid to</label>
          <input id="validTo" className="input" type="date" value={validTo} onChange={(e) => setValidTo(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="maxValue">Max value (optional)</label>
          <input id="maxValue" className="input" type="number" min="0" step="0.01" value={maxValue} onChange={(e) => setMaxValue(e.target.value)} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="field">
        <label>Participating firms ({firmIds.length} selected)</label>
        <div className="card" style={{ padding: 8, maxHeight: 240, overflow: 'auto' }}>
          {firms.map((f) => (
            <label key={f.id} style={{ display: 'flex', gap: 8, padding: '4px 6px', cursor: 'pointer' }}>
              <input type="checkbox" checked={firmIds.includes(f.id)} onChange={() => toggleFirm(f.id)} />
              <span>{f.name}{f.isBlacklisted ? ' (blacklisted!)' : ''}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Agreement document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/frameworks/agreements" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy || firmIds.length === 0}>{busy ? '…' : 'Create draft'}</button>
      </div>
    </form>
  );
}
