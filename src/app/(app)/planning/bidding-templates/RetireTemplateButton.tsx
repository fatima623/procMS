'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RetireTemplateButton({ id }: { readonly id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const reason = window.prompt('Reason for retiring (optional):', '');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/bidding-templates/${id}/retire`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
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
      <button className="btn" onClick={run} disabled={busy}>{busy ? '…' : 'Retire'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
