'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function IncidentActions({ id, status }: { readonly id: string; readonly status: string }) {
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
  function remediate() {
    return post(`/api/misprocurement-incidents/${id}/remediate`, { remediatedOn: new Date().toISOString().slice(0, 10) }, 'remediate');
  }
  function report() {
    return post(`/api/misprocurement-incidents/${id}/report-to-ppra`, { reportedToPPRAOn: new Date().toISOString().slice(0, 10) }, 'report');
  }
  if (status === 'REMEDIATED' || status === 'REPORTED_TO_PPRA') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        <button className="btn btn-primary" onClick={remediate} disabled={busy !== null}>{busy === 'remediate' ? '…' : 'Mark remediated'}</button>
        <button className="btn" onClick={report} disabled={busy !== null}>{busy === 'report' ? '…' : 'Report to PPRA'}</button>
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
