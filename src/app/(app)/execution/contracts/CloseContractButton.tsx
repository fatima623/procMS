'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Formally close a COMPLETED contract. Prompts for the close date (defaults
 * to today) and posts to /api/contracts/[id]/close. Moves the contract to
 * CLOSED and stamps `closedOn`.
 */
export function CloseContractButton({ contractId }: { readonly contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const closedOn = window.prompt('Contract close date (YYYY-MM-DD):', new Date().toISOString().slice(0, 10));
    if (!closedOn) return;
    if (!window.confirm('Close this contract? This is a one-way move from COMPLETED to CLOSED.')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/close`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ closedOn }),
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
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? '…' : 'Close contract'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
