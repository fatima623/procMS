'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Line {
  readonly key: number;
  lineNo: number;
  itemCode: string;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;      // decimal string in main-unit (e.g. "100.00")
}

function toMinor(decimal: string): string {
  if (!/^\d+(\.\d{1,4})?$/.test(decimal)) throw new Error(`Invalid decimal: ${decimal}`);
  const [intPart, fracPartRaw = ''] = decimal.split('.');
  const fracPart = (fracPartRaw + '0000').slice(0, 4);
  return (BigInt(intPart ?? '0') * 10_000n + BigInt(fracPart || '0')).toString();
}

export function NewIndentForm({
  fiscalYears,
  budgetHeads,
}: {
  readonly fiscalYears: readonly { id: string; label: string; isActive: boolean }[];
  readonly budgetHeads: readonly { id: string; code: string; description: string }[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [justification, setJustification] = useState('');
  const [type, setType] = useState<'NORMAL' | 'PROPRIETY'>('NORMAL');
  const [priority, setPriority] = useState<'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [currency, setCurrency] = useState('PKR');
  const activeFy = fiscalYears.find((f) => f.isActive)?.id ?? fiscalYears[0]?.id ?? '';
  const [fiscalYearId, setFiscalYearId] = useState(activeFy);
  const [budgetHeadId, setBudgetHeadId] = useState(budgetHeads[0]?.id ?? '');
  const [lines, setLines] = useState<Line[]>([{ key: 1, lineNo: 1, itemCode: '', description: '', quantity: '1', uom: 'EA', unitPrice: '0.00' }]);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const estimatedTotal = useMemo(() => {
    try {
      return lines.reduce((sum, l) => {
        const qty = Number(l.quantity);
        const price = Number(l.unitPrice);
        if (Number.isNaN(qty) || Number.isNaN(price)) return sum;
        return sum + qty * price;
      }, 0);
    } catch { return 0; }
  }, [lines]);

  function addLine() {
    const next = lines.length === 0 ? 1 : Math.max(...lines.map((l) => l.lineNo)) + 1;
    setLines((ls) => [...ls, { key: Date.now(), lineNo: next, itemCode: '', description: '', quantity: '1', uom: 'EA', unitPrice: '0.00' }]);
  }

  function removeLine(key: number) {
    setLines((ls) => ls.filter((l) => l.key !== key));
  }

  function update(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setSubmitting(true);
    try {
      const items = lines.map((l) => ({
        lineNo: l.lineNo,
        itemCode: l.itemCode || undefined,
        description: l.description,
        quantity: Number(l.quantity),
        uom: l.uom,
        estimatedUnitPriceMinor: toMinor(l.unitPrice),
        currency,
      }));
      // Compute the aggregated total using the same bigint arithmetic the aggregate
      // uses, so the two match exactly to the last decimal.
      const totalMinor = items.reduce((acc, it) => {
        const scaledQty = BigInt(Math.round(it.quantity * 10_000));
        return acc + (BigInt(it.estimatedUnitPriceMinor) * scaledQty) / 10_000n;
      }, 0n);
      const payload = {
        subject,
        justification: justification || undefined,
        type, priority,
        estimatedValueMinor: totalMinor.toString(),
        currency,
        fiscalYearId, budgetHeadId,
        items,
      };
      const res = await fetch('/api/indents', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      router.push(`/indents/${data.data.indentId}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}

      <div className="card">
        <h3>Header</h3>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input id="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={500} />
        </div>
        <div className="field">
          <label htmlFor="justification">Justification (optional)</label>
          <textarea id="justification" className="textarea" value={justification} onChange={(e) => setJustification(e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <div className="field">
            <label>Type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as 'NORMAL' | 'PROPRIETY')}>
              <option value="NORMAL">Normal</option>
              <option value="PROPRIETY">Propriety</option>
            </select>
          </div>
          <div className="field">
            <label>Priority</label>
            <select className="select" value={priority} onChange={(e) => setPriority(e.target.value as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT')}>
              <option>LOW</option><option>NORMAL</option><option>HIGH</option><option>URGENT</option>
            </select>
          </div>
          <div className="field">
            <label>Fiscal year</label>
            <select className="select" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} required>
              {fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Budget head</label>
            <select className="select" value={budgetHeadId} onChange={(e) => setBudgetHeadId(e.target.value)} required>
              {budgetHeads.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.description}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h3 style={{ margin: 0 }}>Items</h3>
          <div className="grow" />
          <div className="field" style={{ margin: 0 }}>
            <label style={{ display: 'inline-block', marginRight: 6 }}>Currency</label>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} style={{ width: 90, display: 'inline-block' }} />
          </div>
          <button type="button" className="btn" onClick={addLine}>+ Add item</button>
        </div>

        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>Item code</th>
              <th>Description</th>
              <th style={{ width: 100 }}>Qty</th>
              <th style={{ width: 80 }}>UoM</th>
              <th style={{ width: 140 }} className="right">Unit price</th>
              <th style={{ width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.key}>
                <td>
                  <input className="input" type="number" min={1} value={l.lineNo} onChange={(e) => update(l.key, { lineNo: Number(e.target.value) })} />
                </td>
                <td>
                  <input className="input" value={l.itemCode} onChange={(e) => update(l.key, { itemCode: e.target.value })} />
                </td>
                <td>
                  <input className="input" value={l.description} onChange={(e) => update(l.key, { description: e.target.value })} required />
                </td>
                <td>
                  <input className="input" type="number" min={0} step="0.0001" value={l.quantity} onChange={(e) => update(l.key, { quantity: e.target.value })} required />
                </td>
                <td>
                  <input className="input" value={l.uom} onChange={(e) => update(l.key, { uom: e.target.value })} required maxLength={20} />
                </td>
                <td className="right">
                  <input className="input right" type="number" min={0} step="0.0001" value={l.unitPrice} onChange={(e) => update(l.key, { unitPrice: e.target.value })} required />
                </td>
                <td>
                  <button type="button" className="btn btn-ghost" onClick={() => removeLine(l.key)} disabled={lines.length === 1} aria-label="Remove">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="right dim" style={{ paddingTop: 10 }}>Estimated total</td>
              <td className="right mono" style={{ paddingTop: 10 }}>{estimatedTotal.toFixed(2)} <span className="muted">{currency}</span></td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="row row-end" style={{ gap: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create draft'}
        </button>
      </div>
    </form>
  );
}
