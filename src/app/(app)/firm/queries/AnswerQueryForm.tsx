'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function AnswerQueryForm({ tsrId, queryId }: { tsrId: string; queryId: string }) {
  const router = useRouter();
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/tsrs/${tsrId}/queries/answer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queryId, response }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ marginTop: 10 }}>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label>Your response</label>
        <textarea className="textarea" value={response} onChange={(e) => setResponse(e.target.value)} required />
      </div>
      <div className="row row-end"><button className="btn btn-primary" disabled={busy} type="submit">{busy ? 'Submitting…' : 'Submit response'}</button></div>
    </form>
  );
}
