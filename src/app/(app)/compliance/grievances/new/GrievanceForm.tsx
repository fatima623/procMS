'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IndentPick { readonly id: string; readonly indentNumber: string; readonly subject: string; readonly status: string; }
interface FirmPick { readonly id: string; readonly name: string; readonly isBlacklisted: boolean; }

export function GrievanceForm({ indents, firms }: { readonly indents: readonly IndentPick[]; readonly firms: readonly FirmPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indentId, setIndentId] = useState(indents[0]?.id ?? '');
  const [firmId, setFirmId] = useState('');
  const [stage, setStage] = useState<'PRE_AWARD' | 'POST_AWARD'>('PRE_AWARD');
  const [filedOn, setFiledOn] = useState(new Date().toISOString().slice(0, 10));
  const [basis, setBasis] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/grievances', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId,
          firmId: firmId || undefined,
          stage,
          filedOn,
          basis,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/compliance/grievances');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (indents.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No live indents available.</p>
        <Link className="btn" href="/compliance/grievances">← Back</Link>
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
        <label htmlFor="firmId">Complainant firm (optional — leave blank for anonymous)</label>
        <select id="firmId" className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
          <option value="">— anonymous —</option>
          {firms.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="stage">Stage</label>
          <select id="stage" className="select" value={stage} onChange={(e) => setStage(e.target.value as typeof stage)}>
            <option value="PRE_AWARD">Pre-award (blocks PR / contract)</option>
            <option value="POST_AWARD">Post-award (informational)</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="filedOn">Filed on</label>
          <input id="filedOn" className="input" type="date" value={filedOn} onChange={(e) => setFiledOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="basis">Basis of complaint</label>
        <textarea id="basis" className="input" rows={5} minLength={10} maxLength={5000} value={basis} onChange={(e) => setBasis(e.target.value)} required placeholder="What provision of the regulatory framework the complainant believes is being violated, and why." />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Supporting document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/compliance/grievances" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'File grievance'}</button>
      </div>
    </form>
  );
}
