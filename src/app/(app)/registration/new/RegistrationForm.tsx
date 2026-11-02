'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FirmPick { readonly id: string; readonly name: string; readonly isBlacklisted: boolean; }

const CATEGORIES = [
  'GOODS',
  'WORKS',
  'SERVICES',
  'ARMAMENT_AMMUNITION',
  'ELECTRONICS',
  'VEHICLES',
  'MEDICAL',
  'TEXTILES',
  'AVIATION',
  'SHIPBUILDING',
  'IT_SOFTWARE',
  'OTHER',
] as const;

export function RegistrationForm({ firms }: { readonly firms: readonly FirmPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [firmId, setFirmId] = useState(firms[0]?.id ?? '');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('GOODS');
  const [submittedOn, setSubmittedOn] = useState(new Date().toISOString().slice(0, 10));
  const [certificateKey, setCertificateKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/firm-registrations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ firmId, category, submittedOn, certificateKey: certificateKey || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/registration');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (firms.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No firms registered yet.</p>
        <Link className="btn" href="/admin/firms">← Back to firms</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 640 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="firmId">Firm</label>
        <select id="firmId" className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
          {firms.map((f) => <option key={f.id} value={f.id}>{f.name}{f.isBlacklisted ? ' (blacklisted)' : ''}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="category">Category</label>
        <select id="category" className="select" value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="submittedOn">Submitted on</label>
        <input id="submittedOn" className="input" type="date" value={submittedOn} onChange={(e) => setSubmittedOn(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="certificateKey">Supporting documents key (optional)</label>
        <input id="certificateKey" className="input" value={certificateKey} onChange={(e) => setCertificateKey(e.target.value)} maxLength={500} />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/registration" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Submit registration'}</button>
      </div>
    </form>
  );
}
