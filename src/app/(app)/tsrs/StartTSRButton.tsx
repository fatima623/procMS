'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * One-click "Start TSR" for the inspectorate/admin queue row.
 * Posts to /api/tsrs with the IT Proforma id, then navigates to the new TSR.
 */
export function StartTSRButton(props: { readonly itPerformaId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/tsrs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itPerformaId: props.itPerformaId }),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      const id = data?.data?.id;
      if (id) router.push(`/tsrs/${id}`);
      else router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button className="btn btn-primary" onClick={start} disabled={busy}>
        {busy ? '…' : 'Start TSR →'}
      </button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </div>
  );
}
