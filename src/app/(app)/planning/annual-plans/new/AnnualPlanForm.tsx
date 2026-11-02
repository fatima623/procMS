'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface FY { readonly id: string; readonly label: string; readonly isActive: boolean; }
interface BudgetHead { readonly id: string; readonly code: string; readonly description: string; }

interface ItemDraft {
  budgetHeadId: string;
  description: string;
  estimatedValue: string;
  currency: string;
  methodHint: string;
  categoryHint: string;
  quarterHint: string;
}

const EMPTY_ITEM = (budgetHeadId: string): ItemDraft => ({
  budgetHeadId,
  description: '',
  estimatedValue: '0.00',
  currency: 'PKR',
  methodHint: '',
  categoryHint: 'GOODS',
  quarterHint: '',
});

export function AnnualPlanForm({ fiscalYears, budgetHeads }: { readonly fiscalYears: readonly FY[]; readonly budgetHeads: readonly BudgetHead[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const activeFy = fiscalYears.find((f) => f.isActive) ?? fiscalYears[0];
  const [fiscalYearId, setFiscalYearId] = useState(activeFy?.id ?? '');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([EMPTY_ITEM(budgetHeads[0]?.id ?? '')]);

  function updateItem(i: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function addItem() { setItems((prev) => [...prev, EMPTY_ITEM(budgetHeads[0]?.id ?? '')]); }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/annual-plans', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          fiscalYearId,
          notes: notes || undefined,
          items: items.map((it) => ({
            budgetHeadId: it.budgetHeadId,
            description: it.description,
            estimatedValue: it.estimatedValue,
            currency: it.currency,
            methodHint: it.methodHint || undefined,
            categoryHint: it.categoryHint || undefined,
            quarterHint: it.quarterHint || undefined,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push('/planning/annual-plans');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  if (fiscalYears.length === 0 || budgetHeads.length === 0) {
    return (
      <div className="card" style={{ padding: 16 }}>
        <p>{fiscalYears.length === 0 ? 'No fiscal years configured.' : 'No active budget heads configured.'}</p>
        <Link className="btn" href="/admin">← Back to admin</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 920 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="fiscalYearId">Fiscal year</label>
        <select id="fiscalYearId" className="select" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)}>
          {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="notes">Notes (optional)</label>
        <textarea id="notes" className="input" rows={2} maxLength={5000} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <h3 style={{ margin: '14px 0 6px' }}>Planned items</h3>
      <table className="table">
        <thead>
          <tr>
            <th>Budget head</th>
            <th>Description</th>
            <th>Estimated value</th>
            <th>Currency</th>
            <th>Method</th>
            <th>Category</th>
            <th>Quarter</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={i}>
              <td>
                <select className="select" value={it.budgetHeadId} onChange={(e) => updateItem(i, { budgetHeadId: e.target.value })}>
                  {budgetHeads.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
                </select>
              </td>
              <td><input className="input" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} minLength={3} maxLength={500} required /></td>
              <td><input className="input" type="number" min="0" step="0.01" value={it.estimatedValue} onChange={(e) => updateItem(i, { estimatedValue: e.target.value })} required /></td>
              <td><input className="input" maxLength={3} value={it.currency} onChange={(e) => updateItem(i, { currency: e.target.value.toUpperCase() })} required /></td>
              <td>
                <select className="select" value={it.methodHint} onChange={(e) => updateItem(i, { methodHint: e.target.value })}>
                  <option value="">— any —</option>
                  <option value="OPEN_COMPETITIVE_BIDDING">OPEN BIDDING</option>
                  <option value="LIMITED_BIDDING">LIMITED</option>
                  <option value="RFQ">RFQ</option>
                  <option value="DIRECT_CONTRACTING">DIRECT</option>
                </select>
              </td>
              <td>
                <select className="select" value={it.categoryHint} onChange={(e) => updateItem(i, { categoryHint: e.target.value })}>
                  <option value="GOODS">GOODS</option>
                  <option value="WORKS">WORKS</option>
                  <option value="SERVICES">SERVICES</option>
                </select>
              </td>
              <td>
                <select className="select" value={it.quarterHint} onChange={(e) => updateItem(i, { quarterHint: e.target.value })}>
                  <option value="">—</option>
                  <option value="Q1">Q1</option>
                  <option value="Q2">Q2</option>
                  <option value="Q3">Q3</option>
                  <option value="Q4">Q4</option>
                </select>
              </td>
              <td className="right">
                {items.length > 1 && <button type="button" className="btn" onClick={() => removeItem(i)}>Remove</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row row-end" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn" onClick={addItem}>+ Add item</button>
      </div>

      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/planning/annual-plans" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Create draft plan'}</button>
      </div>
    </form>
  );
}
