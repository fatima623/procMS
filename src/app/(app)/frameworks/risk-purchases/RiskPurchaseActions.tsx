'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RiskPurchaseActions({ id, status }: { readonly id: string; readonly status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  async function post(path: string, body: Record<string, unknown>, label: string) {
    setBusy(label);
    setErr(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }
  function link() {
    const indentId = window.prompt('Replacement indent id (optional):', '');
    const contractId = window.prompt('Replacement contract id (optional):', '');
    if (!indentId && !contractId) return;
    return post(`/api/risk-purchases/${id}/link-replacement`, {
      replacementIndentId: indentId || undefined,
      replacementContractId: contractId || undefined,
    }, 'link');
  }
  function settle() {
    const amt = window.prompt('Settled amount:');
    if (!amt) return;
    return post(`/api/risk-purchases/${id}/settle`, {
      riskSettled: amt,
      currency: 'PKR',
      settledOn: new Date().toISOString().slice(0, 10),
    }, 'settle');
  }
  function close() {
    return post(`/api/risk-purchases/${id}/close`, { closedOn: new Date().toISOString().slice(0, 10) }, 'close');
  }

  if (status === 'CLOSED') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn" onClick={link} disabled={busy !== null}>{busy === 'link' ? '…' : 'Link replacement'}</button>
        {status !== 'SETTLED' && <button className="btn" onClick={settle} disabled={busy !== null}>{busy === 'settle' ? '…' : 'Settle'}</button>}
        <button className="btn btn-primary" onClick={close} disabled={busy !== null}>{busy === 'close' ? '…' : 'Close'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
