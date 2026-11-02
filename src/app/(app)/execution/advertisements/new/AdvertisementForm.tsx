'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface IndentRef {
  readonly id: string;
  readonly indentNumber: string;
  readonly subject: string;
  readonly status: string;
}

export function AdvertisementForm({ indents }: { readonly indents: readonly IndentRef[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [indentId, setIndentId] = useState(indents[0]?.id ?? '');
  const [medium, setMedium] = useState<'PPRA_WEBSITE' | 'NEWSPAPER' | 'EPADS' | 'OTHER'>('PPRA_WEBSITE');
  const [publishedOn, setPublishedOn] = useState(new Date().toISOString().slice(0, 10));
  const [biddingDocsIssuedOn, setBiddingDocsIssuedOn] = useState('');
  const [bidSubmissionDeadline, setBidSubmissionDeadline] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/advertisements', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId,
          medium,
          publishedOn,
          biddingDocsIssuedOn: biddingDocsIssuedOn || undefined,
          bidSubmissionDeadline: bidSubmissionDeadline || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/execution/advertisements');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (indents.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No indent is currently in a stage where it can be advertised (IT_APPROVAL and later).</p>
        <Link className="btn" href="/indents">← Back to indents</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="indentId">Indent</label>
        <select id="indentId" className="select" value={indentId} onChange={(e) => setIndentId(e.target.value)}>
          {indents.map((i) => <option key={i.id} value={i.id}>{i.indentNumber} — {i.subject} ({i.status})</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="medium">Medium</label>
        <select id="medium" className="select" value={medium} onChange={(e) => setMedium(e.target.value as typeof medium)}>
          <option value="PPRA_WEBSITE">PPRA website</option>
          <option value="NEWSPAPER">Newspaper (print)</option>
          <option value="EPADS">EPADS</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="publishedOn">Published on</label>
        <input id="publishedOn" className="input" type="date" value={publishedOn} onChange={(e) => setPublishedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="biddingDocsIssuedOn">Bidding documents issued on (optional)</label>
        <input id="biddingDocsIssuedOn" className="input" type="date" value={biddingDocsIssuedOn} onChange={(e) => setBiddingDocsIssuedOn(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="bidSubmissionDeadline">Bid submission deadline (optional)</label>
        <input id="bidSubmissionDeadline" className="input" type="date" value={bidSubmissionDeadline} onChange={(e) => setBidSubmissionDeadline(e.target.value)} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/execution/advertisements" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Record advertisement'}</button>
      </div>
    </form>
  );
}
