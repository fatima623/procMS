'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Add a hearing to a PENDING court case. */
export function ProceedingForm({ caseId }: { readonly caseId: string }) {
  const router = useRouter();
  const [hearingDate, setHearingDate] = useState(localToday);
  const [outcome, setOutcome] = useState('');
  const [nextHearingDate, setNextHearingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [documentKey, setDocumentKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nextHearingDate && nextHearingDate <= hearingDate) {
      setErr('Next hearing date must be after the hearing date');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/court-cases/${caseId}/proceedings`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hearingDate,
          outcome,
          nextHearingDate: nextHearingDate || undefined,
          notes: notes || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setOutcome('');
      setNextHearingDate('');
      setNotes('');
      setDocumentKey('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="hearingDate">Hearing date</label>
          <input id="hearingDate" className="input" type="date" value={hearingDate} onChange={(e) => setHearingDate(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="nextHearingDate">Next hearing date (optional)</label>
          <input id="nextHearingDate" className="input" type="date" value={nextHearingDate} min={hearingDate} onChange={(e) => setNextHearingDate(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="outcome">Outcome</label>
        <input id="outcome" className="input" value={outcome} onChange={(e) => setOutcome(e.target.value)} minLength={2} maxLength={500} placeholder="e.g. Adjourned; reply sought from respondent" required />
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={3} maxLength={10000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="procDocumentKey">Scanned order reference (optional)</label>
        <input id="procDocumentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Add proceeding'}</button>
    </form>
  );
}
