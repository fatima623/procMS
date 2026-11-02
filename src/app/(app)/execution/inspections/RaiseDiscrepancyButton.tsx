'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RaiseDiscrepancyButton({ inspectionId }: { readonly inspectionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function raise() {
    const description = window.prompt('Discrepancy description:');
    if (!description || description.trim().length < 5) return;
    const sev = window.prompt('Severity: MINOR / MAJOR / CRITICAL (default MAJOR)', 'MAJOR');
    const severity = sev && ['MINOR', 'MAJOR', 'CRITICAL'].includes(sev.toUpperCase()) ? sev.toUpperCase() : 'MAJOR';
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/discrepancies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inspectionId, raisedOn: new Date().toISOString().slice(0, 10), description, severity }),
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
      <button className="btn" onClick={raise} disabled={busy}>{busy ? '…' : '+ Discrepancy'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
