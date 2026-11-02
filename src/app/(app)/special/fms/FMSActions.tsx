'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FMSActions({ id, status }: { readonly id: string; readonly status: string }) {
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
  function recordLOA() {
    const value = window.prompt('LOA value:');
    if (!value) return;
    const currency = window.prompt('Currency (3 letters):', 'USD') ?? 'USD';
    return post(`/api/fms-cases/${id}/loa`, {
      loaReceivedOn: new Date().toISOString().slice(0, 10),
      loaValue: value,
      currency: currency.toUpperCase(),
    }, 'loa');
  }
  function accept() { return post(`/api/fms-cases/${id}/accept-loa`, { loaAcceptedOn: new Date().toISOString().slice(0, 10) }, 'accept'); }
  function implement() { return post(`/api/fms-cases/${id}/implement`, {}, 'implement'); }
  function completeDelivery() { return post(`/api/fms-cases/${id}/complete-delivery`, { deliveryCompletedOn: new Date().toISOString().slice(0, 10) }, 'delivery'); }
  function close() { return post(`/api/fms-cases/${id}/close`, { closedOn: new Date().toISOString().slice(0, 10) }, 'close'); }

  if (status === 'CLOSED' || status === 'CANCELLED') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {status === 'LOR_SUBMITTED' && <button className="btn btn-primary" onClick={recordLOA} disabled={busy !== null}>{busy === 'loa' ? '…' : 'Record LOA'}</button>}
        {status === 'LOA_RECEIVED' && <button className="btn btn-primary" onClick={accept} disabled={busy !== null}>{busy === 'accept' ? '…' : 'Accept LOA'}</button>}
        {status === 'LOA_ACCEPTED' && <button className="btn" onClick={implement} disabled={busy !== null}>{busy === 'implement' ? '…' : 'Enter implementation'}</button>}
        {(status === 'LOA_ACCEPTED' || status === 'IN_IMPLEMENTATION') && <button className="btn" onClick={completeDelivery} disabled={busy !== null}>{busy === 'delivery' ? '…' : 'Delivery done'}</button>}
        {status !== 'LOR_SUBMITTED' && <button className="btn" onClick={close} disabled={busy !== null}>{busy === 'close' ? '…' : 'Close'}</button>}
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
