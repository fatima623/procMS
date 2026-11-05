'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Post-assessment waiver on an LD row. Prompts for amount + reason and posts
 * to /api/liquidated-damages/[id]/waive. Service refuses waivers larger than
 * the assessed amount.
 */
export function WaiveLDButton({ id, currentWaivedAmountMinor }: { readonly id: string; readonly currentWaivedAmountMinor: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const amount = window.prompt('Waiver amount (same currency as the LD):');
    if (!amount || !amount.trim()) return;
    const reason = window.prompt('Reason for waiver (minimum 5 characters):');
    if (!reason || reason.trim().length < 5) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/liquidated-damages/${id}/waive`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ waivedAmount: amount.trim(), waivedReason: reason.trim() }),
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
      <button className="btn" onClick={run} disabled={busy} title={currentWaivedAmountMinor ? 'Overwrite existing waiver' : 'Grant waiver'}>
        {busy ? '…' : currentWaivedAmountMinor ? 'Revise waiver' : 'Waive'}
      </button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
