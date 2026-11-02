'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FirmPick { readonly id: string; readonly name: string; readonly isBlacklisted: boolean; }

const GROUNDS = [
  'CORRUPT_PRACTICE',
  'FRAUDULENT_PRACTICE',
  'COERCIVE_PRACTICE',
  'COLLUSIVE_PRACTICE',
  'OBSTRUCTIVE_PRACTICE',
  'PERFORMANCE_FAILURE',
  'BID_DEVIATION',
  'OTHER',
] as const;

export function BlacklistForm({ firms }: { readonly firms: readonly FirmPick[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [firmId, setFirmId] = useState(firms[0]?.id ?? '');
  const [ground, setGround] = useState<(typeof GROUNDS)[number]>('CORRUPT_PRACTICE');
  const [reason, setReason] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const [declaredOn, setDeclaredOn] = useState(today);
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [effectiveUntil, setEffectiveUntil] = useState('');
  const [documentKey, setDocumentKey] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/blacklists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          firmId,
          ground,
          reason,
          declaredOn,
          effectiveFrom,
          effectiveUntil: effectiveUntil || undefined,
          documentKey: documentKey || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/compliance/blacklists');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (firms.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>No firms registered.</p>
        <Link className="btn" href="/admin/firms">← Back to firms</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 720 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="firmId">Firm</label>
        <select id="firmId" className="select" value={firmId} onChange={(e) => setFirmId(e.target.value)}>
          {firms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}{f.isBlacklisted ? ' (already blacklisted)' : ''}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="ground">Ground</label>
        <select id="ground" className="select" value={ground} onChange={(e) => setGround(e.target.value as (typeof GROUNDS)[number])}>
          {GROUNDS.map((g) => <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="reason">Reason / order text</label>
        <textarea id="reason" className="input" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} required minLength={10} maxLength={5000} placeholder="At minimum, a one-paragraph summary of the facts justifying the declaration." />
      </div>
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="declaredOn">Declared on</label>
          <input id="declaredOn" className="input" type="date" value={declaredOn} onChange={(e) => setDeclaredOn(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="effectiveFrom">Effective from</label>
          <input id="effectiveFrom" className="input" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} required />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="effectiveUntil">Effective until (optional, blank = indefinite)</label>
          <input id="effectiveUntil" className="input" type="date" value={effectiveUntil} onChange={(e) => setEffectiveUntil(e.target.value)} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="documentKey">Signed-order document key (optional)</label>
        <input id="documentKey" className="input" value={documentKey} onChange={(e) => setDocumentKey(e.target.value)} maxLength={500} placeholder="S3 / object-store key for the signed order" />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/compliance/blacklists" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Declare blacklist'}</button>
      </div>
    </form>
  );
}
