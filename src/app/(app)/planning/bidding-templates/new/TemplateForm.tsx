'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function TemplateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kind, setKind] = useState<'GOODS' | 'WORKS' | 'SERVICES' | 'CONSULTANCY'>('GOODS');
  const [name, setName] = useState('');
  const [revision, setRevision] = useState('');
  const [publishedOn, setPublishedOn] = useState(new Date().toISOString().slice(0, 10));
  const [bodyKey, setBodyKey] = useState('');
  const [summary, setSummary] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/bidding-templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind, name, revision, publishedOn,
          bodyKey: bodyKey || undefined,
          summary: summary || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/planning/bidding-templates');
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
          <label htmlFor="kind">Kind</label>
          <select id="kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            <option value="GOODS">Goods</option>
            <option value="WORKS">Works</option>
            <option value="SERVICES">Services</option>
            <option value="CONSULTANCY">Consultancy</option>
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="revision">Revision</label>
          <input id="revision" className="input" value={revision} onChange={(e) => setRevision(e.target.value)} maxLength={40} required placeholder="v1 / 2026-01 / etc" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={200} required />
      </div>
      <div className="field">
        <label htmlFor="publishedOn">Published on</label>
        <input id="publishedOn" className="input" type="date" value={publishedOn} onChange={(e) => setPublishedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="summary">Summary (optional)</label>
        <textarea id="summary" className="input" rows={3} maxLength={5000} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="bodyKey">Template body document key (optional)</label>
        <input id="bodyKey" className="input" value={bodyKey} onChange={(e) => setBodyKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/planning/bidding-templates" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Register template'}</button>
      </div>
    </form>
  );
}
