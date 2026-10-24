'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MoneyLabel } from '@/interfaces/ui/components/Money';

interface OfferRow {
  readonly id: string;
  readonly firmName: string;
  readonly firmCode: string;
  readonly totalPriceMinor: string;
  readonly currency: string;
  readonly deliveryWeeks: number | null;
  readonly suggestedRank: number;
  readonly suggestedRecommend: boolean;
}

interface EditLine { rank: number; recommended: boolean; justification: string; }

export function NewCSTForm({
  indentId,
  itPerformaId,
  offers,
}: {
  readonly indentId: string;
  readonly itPerformaId: string;
  readonly offers: readonly OfferRow[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<Record<string, EditLine>>(
    () => Object.fromEntries(offers.map((o) => [o.id, { rank: o.suggestedRank, recommended: o.suggestedRecommend, justification: '' }])),
  );
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function setLine(id: string, patch: Partial<EditLine>) {
    setEdit((e) => ({ ...e, [id]: { ...e[id]!, ...patch } }));
  }

  function setRecommendedOnly(id: string) {
    setEdit((e) => {
      const next: Record<string, EditLine> = {};
      for (const k of Object.keys(e)) next[k] = { ...e[k]!, recommended: k === id };
      return next;
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const lines = offers.map((o) => ({
      commercialOfferId: o.id,
      rank: edit[o.id]!.rank,
      recommendedForAward: edit[o.id]!.recommended,
      justification: edit[o.id]!.justification || undefined,
    }));
    setBusy(true);
    try {
      const res = await fetch('/api/csts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ itPerformaId, lines }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push(`/indents/${indentId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 70 }}>Rank</th>
              <th>Firm</th>
              <th className="right">Price</th>
              <th>Delivery</th>
              <th>Recommend</th>
              <th>Justification</th>
            </tr>
          </thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id}>
                <td>
                  <input className="input" type="number" min={1} value={edit[o.id]!.rank} onChange={(e) => setLine(o.id, { rank: Number(e.target.value) })} />
                </td>
                <td>{o.firmName} <span className="muted mono">({o.firmCode})</span></td>
                <td className="right"><MoneyLabel amountMinor={o.totalPriceMinor} currency={o.currency} /></td>
                <td className="mono">{o.deliveryWeeks ?? '—'}{o.deliveryWeeks ? 'w' : ''}</td>
                <td>
                  <input type="radio" name="recommend" checked={edit[o.id]!.recommended} onChange={() => setRecommendedOnly(o.id)} />
                </td>
                <td>
                  <input className="input" value={edit[o.id]!.justification} onChange={(e) => setLine(o.id, { justification: e.target.value })} placeholder="(optional)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Preparing…' : 'Create CST'}</button></div>
    </form>
  );
}
