'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AckPRButton({ prId }: { prId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function acknowledge() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/prs/${prId}/acknowledge`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {err && <div className="err" style={{ marginBottom: 4 }}>{err}</div>}
      <button className="btn btn-primary" onClick={acknowledge} disabled={busy}>
        {busy ? 'Submitting…' : 'Acknowledge'}
      </button>
    </>
  );
}
