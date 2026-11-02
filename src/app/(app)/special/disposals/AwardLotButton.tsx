'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function AwardLotButton({ lotId, currency }: { readonly lotId: string; readonly currency: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function run() {
    const bid = window.prompt('Winning bid amount:');
    if (!bid) return;
    const name = window.prompt('Winning bidder name:');
    if (!name) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/disposal-lots/${lotId}/award`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          winningBid: bid,
          currency,
          winningBidderName: name,
          awardedOn: new Date().toISOString().slice(0, 10),
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
      <button className="btn btn-primary" onClick={run} disabled={busy}>{busy ? '…' : 'Award lot'}</button>
      {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
    </span>
  );
}
