'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function IssueTakingOverButton({ contractId }: { readonly contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const certifiedOn = window.prompt('Taking-Over Certificate date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!certifiedOn) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/taking-over`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ certifiedOn }),
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
      <button className="btn" onClick={run} disabled={busy}>{busy ? '…' : 'Issue TOC'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
