'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TerminateContractButton({ contractId }: { readonly contractId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const reason = window.prompt('Termination reason (minimum 10 characters). A risk-purchase case will be opened automatically.');
    if (!reason || reason.trim().length < 10) return;
    if (!window.confirm('Terminate this contract and open a risk-purchase case? This moves the contract to TERMINATED.')) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/contracts/${contractId}/terminate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          terminationReason: reason,
          initiatedOn: new Date().toISOString().slice(0, 10),
          openRiskPurchaseCase: true,
        }),
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
      <button className="btn btn-danger" onClick={run} disabled={busy}>{busy ? '…' : 'Terminate + risk purchase'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
