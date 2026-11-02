'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function IncidentForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indentId, setIndentId] = useState('');
  const [ruleReference, setRuleReference] = useState('PPRA Rule ');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [detectedOn, setDetectedOn] = useState(new Date().toISOString().slice(0, 10));
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/misprocurement-incidents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId: indentId || undefined,
          ruleReference,
          summary,
          details,
          severity,
          detectedOn,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/transparency/incidents');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="ruleReference">Rule reference</label>
          <input id="ruleReference" className="input" value={ruleReference} onChange={(e) => setRuleReference(e.target.value)} minLength={3} maxLength={80} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="severity">Severity</label>
          <select id="severity" className="select" value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="indentId">Indent id (optional)</label>
        <input id="indentId" className="input" value={indentId} onChange={(e) => setIndentId(e.target.value)} maxLength={26} placeholder="leave blank for systemic incident" />
      </div>
      <div className="field">
        <label htmlFor="summary">Summary (≤ 500 chars)</label>
        <input id="summary" className="input" value={summary} onChange={(e) => setSummary(e.target.value)} minLength={5} maxLength={500} required />
      </div>
      <div className="field">
        <label htmlFor="details">Details</label>
        <textarea id="details" className="input" rows={5} minLength={10} maxLength={5000} value={details} onChange={(e) => setDetails(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="detectedOn">Detected on</label>
        <input id="detectedOn" className="input" type="date" value={detectedOn} onChange={(e) => setDetectedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="documentKey">Supporting document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/transparency/incidents" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Log incident'}</button>
      </div>
    </form>
  );
}
