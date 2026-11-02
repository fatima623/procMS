'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function FrameworkActions({ id, status }: { readonly id: string; readonly status: string }) {
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
  function activate() {
    return post(`/api/framework-agreements/${id}/activate`, { signedOn: new Date().toISOString().slice(0, 10) }, 'activate');
  }
  function terminate() {
    const reason = window.prompt('Termination reason (minimum 5 characters):');
    if (!reason || reason.trim().length < 5) return;
    return post(`/api/framework-agreements/${id}/terminate`, { terminatedOn: new Date().toISOString().slice(0, 10), terminatedReason: reason }, 'terminate');
  }
  if (status === 'TERMINATED' || status === 'EXPIRED') return <span className="muted">—</span>;
  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{ display: 'inline-flex', gap: 6 }}>
        {status === 'DRAFT' && <button className="btn btn-primary" onClick={activate} disabled={busy !== null}>{busy === 'activate' ? '…' : 'Activate'}</button>}
        {status === 'ACTIVE' && <button className="btn" onClick={terminate} disabled={busy !== null}>{busy === 'terminate' ? '…' : 'Terminate'}</button>}
      </span>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
