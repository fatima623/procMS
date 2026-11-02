'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ResolveDiscrepancyButton({ id }: { readonly id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function resolve(outcome: 'RESOLVED' | 'WAIVED') {
    const notes = window.prompt(`${outcome === 'RESOLVED' ? 'Resolution' : 'Waiver'} notes (minimum 5 characters):`);
    if (!notes || notes.trim().length < 5) return;
    setBusy(outcome);
    setErr(null);
    try {
      const res = await fetch(`/api/discrepancies/${id}/resolve`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ resolvedOn: new Date().toISOString().slice(0, 10), resolutionNotes: notes, outcome }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={() => resolve('RESOLVED')} disabled={busy !== null}>{busy === 'RESOLVED' ? '…' : 'Resolve'}</button>
        <button className="btn" onClick={() => resolve('WAIVED')} disabled={busy !== null}>{busy === 'WAIVED' ? '…' : 'Waive'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
