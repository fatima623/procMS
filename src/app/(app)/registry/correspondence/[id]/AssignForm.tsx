'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AssignForm(props: {
  readonly id: string;
  readonly current: string | null;
  readonly users: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(props.current ?? '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/correspondence/${props.id}/assign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assignedToUserId: userId || null }),
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
    <div className="row" style={{ gap: 8, marginTop: 12 }}>
      <label htmlFor="assign" className="muted">Assign to</label>
      <select id="assign" className="select" value={userId} onChange={(e) => setUserId(e.target.value)} style={{ maxWidth: 380 }}>
        <option value="">— Not assigned —</option>
        {props.users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </select>
      <button className="btn" onClick={save} disabled={busy || userId === (props.current ?? '')}>{busy ? '…' : 'Save assignment'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </div>
  );
}
