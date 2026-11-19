'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function CorrespondenceForm({ users }: { readonly users: readonly { id: string; label: string }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [direction, setDirection] = useState<'INWARD' | 'OUTWARD'>('INWARD');
  const [controlNumber, setControlNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [fromParty, setFromParty] = useState('');
  const [toParty, setToParty] = useState('DP(N)');
  const [receivedOrSentOn, setReceivedOrSentOn] = useState(localToday);
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  function changeDirection(d: 'INWARD' | 'OUTWARD') {
    setDirection(d);
    // Swap the DP(N) default to the side that matches the direction.
    if (d === 'OUTWARD' && toParty === 'DP(N)' && !fromParty) { setFromParty('DP(N)'); setToParty(''); }
    if (d === 'INWARD' && fromParty === 'DP(N)' && !toParty) { setToParty('DP(N)'); setFromParty(''); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/correspondence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          direction,
          controlNumber: controlNumber.trim() || undefined,
          subject,
          fromParty,
          toParty,
          receivedOrSentOn,
          assignedToUserId: assignedToUserId || undefined,
          remarks: remarks || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push(data.data?.id ? `/registry/correspondence/${data.data.id}` : '/registry/correspondence');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="direction">Direction</label>
          <select id="direction" className="select" value={direction} onChange={(e) => changeDirection(e.target.value as 'INWARD' | 'OUTWARD')}>
            <option value="INWARD">Inward (received)</option>
            <option value="OUTWARD">Outward (sent)</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="controlNumber">Control number (optional)</label>
          <input id="controlNumber" className="input mono" value={controlNumber} onChange={(e) => setControlNumber(e.target.value.toUpperCase())} maxLength={40} placeholder="auto" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="receivedOrSentOn">{direction === 'INWARD' ? 'Received on' : 'Sent on'}</label>
          <input id="receivedOrSentOn" className="input" type="date" value={receivedOrSentOn} onChange={(e) => setReceivedOrSentOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} minLength={3} maxLength={500} required />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="fromParty">From</label>
          <input id="fromParty" className="input" value={fromParty} onChange={(e) => setFromParty(e.target.value)} minLength={2} maxLength={200} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="toParty">To</label>
          <input id="toParty" className="input" value={toParty} onChange={(e) => setToParty(e.target.value)} minLength={2} maxLength={200} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="assignedToUserId">Assign to officer (optional)</label>
        <select id="assignedToUserId" className="select" value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value)}>
          <option value="">— Not assigned —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="remarks">Remarks (optional)</label>
        <textarea id="remarks" className="input" rows={3} maxLength={5000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Scanned document reference (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/registry/correspondence" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'File correspondence'}</button>
      </div>
    </form>
  );
}
