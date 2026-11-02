'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IndentPick { readonly id: string; readonly indentNumber: string; readonly subject: string; }

export function FMSForm({ indents }: { readonly indents: readonly IndentPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indentId, setIndentId] = useState(indents[0]?.id ?? '');
  const [caseNumber, setCaseNumber] = useState('');
  const [foreignAuthority, setForeignAuthority] = useState('');
  const [lorSubmittedOn, setLorSubmittedOn] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/fms-cases', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId, caseNumber, foreignAuthority, lorSubmittedOn, currency,
          notes: notes || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/special/fms');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (indents.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No indents available without an FMS case.</p>
        <Link className="btn" href="/indents">← Back to indents</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="indentId">Indent</label>
        <select id="indentId" className="select" value={indentId} onChange={(e) => setIndentId(e.target.value)}>
          {indents.map((i) => <option key={i.id} value={i.id}>{i.indentNumber} — {i.subject}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="caseNumber">FMS case number</label>
          <input id="caseNumber" className="input" value={caseNumber} onChange={(e) => setCaseNumber(e.target.value)} minLength={3} maxLength={60} required />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="foreignAuthority">Foreign authority</label>
          <input id="foreignAuthority" className="input" value={foreignAuthority} onChange={(e) => setForeignAuthority(e.target.value)} minLength={3} maxLength={255} required placeholder="e.g. US DSCA, UK DESO" />
        </div>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="lorSubmittedOn">LOR submitted on</label>
          <input id="lorSubmittedOn" className="input" type="date" value={lorSubmittedOn} onChange={(e) => setLorSubmittedOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="currency">Currency</label>
          <input id="currency" className="input" maxLength={3} value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={3} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="documentKey">LOR document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/special/fms" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Open case (LOR submitted)'}</button>
      </div>
    </form>
  );
}
