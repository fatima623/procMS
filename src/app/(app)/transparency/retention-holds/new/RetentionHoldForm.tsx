'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const REASONS = ['LITIGATION', 'AUDIT_INQUIRY', 'INVESTIGATION', 'REGULATORY_HOLD', 'OTHER'] as const;

export function RetentionHoldForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [subjectType, setSubjectType] = useState('INDENT');
  const [subjectId, setSubjectId] = useState('');
  const [reason, setReason] = useState<(typeof REASONS)[number]>('LITIGATION');
  const [placedOn, setPlacedOn] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/retention-holds', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ subjectType, subjectId, reason, placedOn, notes: notes || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/transparency/retention-holds');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="subjectType">Subject type</label>
          <input id="subjectType" className="input" value={subjectType} onChange={(e) => setSubjectType(e.target.value.toUpperCase())} maxLength={40} required />
        </div>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="subjectId">Subject id</label>
          <input id="subjectId" className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} maxLength={26} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="reason">Reason</label>
        <select id="reason" className="select" value={reason} onChange={(e) => setReason(e.target.value as (typeof REASONS)[number])}>
          {REASONS.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="placedOn">Placed on</label>
        <input id="placedOn" className="input" type="date" value={placedOn} onChange={(e) => setPlacedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={3} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/transparency/retention-holds" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Place hold'}</button>
      </div>
    </form>
  );
}
