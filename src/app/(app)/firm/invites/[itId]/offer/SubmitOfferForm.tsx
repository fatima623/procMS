'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function SubmitOfferForm({ itPerformaId }: { itPerformaId: string }) {
  const router = useRouter();
  const [documentKey, setDocumentKey] = useState('');
  const [remarks, setRemarks] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/technical-offers', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itPerformaId, documentKey: documentKey || undefined, remarks: remarks || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/firm/invites');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="card">
        <div className="field">
          <label>Technical document reference (storage key / URL)</label>
          <input className="input mono" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} placeholder="e.g. s3://offers/firmA/2026/00042.pdf" />
        </div>
        <div className="field">
          <label>Remarks (optional)</label>
          <textarea className="textarea" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit offer'}</button></div>
    </form>
  );
}
