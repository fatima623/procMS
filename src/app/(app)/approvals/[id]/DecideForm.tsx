'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function DecideForm({ chainId }: { chainId: string }) {
  const router = useRouter();
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'RETURNED'>('APPROVED');
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/approvals/${chainId}/decide`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ decision, comments: comments || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/approvals');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const needComments = decision !== 'APPROVED';

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label>Decision</label>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['APPROVED', 'REJECTED', 'RETURNED'] as const).map((d) => (
            <label key={d} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} />
              <span>{d}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label>Comments{needComments ? ' (recommended)' : ' (optional)'}</label>
        <textarea className="textarea" value={comments} onChange={(e) => setComments(e.target.value)} rows={4} />
      </div>
      <div className="row row-end">
        <button className={`btn ${decision === 'APPROVED' ? 'btn-primary' : 'btn-danger'}`} disabled={busy} type="submit">
          {busy ? 'Submitting…' : `Submit ${decision}`}
        </button>
      </div>
    </form>
  );
}
