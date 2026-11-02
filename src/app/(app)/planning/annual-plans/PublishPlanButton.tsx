'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PublishPlanButton({ id }: { readonly id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const publishedOn = window.prompt('Publication date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!publishedOn) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/annual-plans/${id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ publishedOn }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? '…' : 'Publish plan'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
