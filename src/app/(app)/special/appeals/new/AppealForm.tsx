'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface GrievancePick { readonly id: string; readonly indentId: string; readonly status: string; }

export function AppealForm({ grievances }: { readonly grievances: readonly GrievancePick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [grievanceId, setGrievanceId] = useState(grievances[0]?.id ?? '');
  const [filedOn, setFiledOn] = useState(new Date().toISOString().slice(0, 10));
  const [basis, setBasis] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ grievanceId, filedOn, basis, documentKey: documentKey || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/special/appeals');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (grievances.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No decided grievances available to appeal.</p>
        <Link className="btn" href="/compliance/grievances">← Back to grievances</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="grievanceId">Grievance</label>
        <select id="grievanceId" className="select" value={grievanceId} onChange={(e) => setGrievanceId(e.target.value)}>
          {grievances.map((g) => <option key={g.id} value={g.id}>{g.id} — indent {g.indentId.slice(-8)} ({g.status})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="filedOn">Filed on</label>
        <input id="filedOn" className="input" type="date" value={filedOn} onChange={(e) => setFiledOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="basis">Basis of appeal</label>
        <textarea id="basis" className="input" rows={5} minLength={10} maxLength={5000} value={basis} onChange={(e) => setBasis(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Supporting document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/special/appeals" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'File appeal'}</button>
      </div>
    </form>
  );
}
