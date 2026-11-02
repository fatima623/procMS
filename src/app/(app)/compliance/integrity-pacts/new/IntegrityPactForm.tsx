'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IndentPick { readonly id: string; readonly indentNumber: string; readonly subject: string; readonly status: string; }
interface FirmPick { readonly id: string; readonly name: string; readonly isBlacklisted: boolean; }

export function IntegrityPactForm({ indents, firms }: { readonly indents: readonly IndentPick[]; readonly firms: readonly FirmPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indentId, setIndentId] = useState(indents[0]?.id ?? '');
  const [firmId, setFirmId] = useState(firms[0]?.id ?? '');
  const [signedByBuyerOn, setSignedByBuyerOn] = useState(new Date().toISOString().slice(0, 10));
  const [signedBySupplierOn, setSignedBySupplierOn] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/integrity-pacts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId,
          firmId,
          signedByBuyerOn,
          signedBySupplierOn: signedBySupplierOn || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/compliance/integrity-pacts');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (indents.length === 0 || firms.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>{indents.length === 0 ? 'No live indents available.' : 'No active firms registered.'}</p>
        <Link className="btn" href="/compliance/integrity-pacts">← Back</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="indentId">Indent</label>
        <select id="indentId" className="select" value={indentId} onChange={(e) => setIndentId(e.target.value)}>
          {indents.map((i) => <option key={i.id} value={i.id}>{i.indentNumber} — {i.subject} ({i.status})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="firmId">Firm</label>
        <select id="firmId" className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
          {firms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.isBlacklisted ? ' (blacklisted!)' : ''}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="signedByBuyerOn">Signed by buyer on</label>
          <input id="signedByBuyerOn" className="input" type="date" value={signedByBuyerOn} onChange={(e) => setSignedByBuyerOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="signedBySupplierOn">Signed by supplier on (optional)</label>
          <input id="signedBySupplierOn" className="input" type="date" value={signedBySupplierOn} onChange={(e) => setSignedBySupplierOn(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Signed pact document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/compliance/integrity-pacts" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Register pact'}</button>
      </div>
    </form>
  );
}
