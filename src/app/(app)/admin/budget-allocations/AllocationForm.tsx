'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

interface Ref { id: string; label: string; }

export function AllocationForm(props:
  | {
      mode: 'create';
      fiscalYears: readonly { id: string; label: string; isActive: boolean }[];
      budgetHeads: readonly { id: string; code: string; description: string }[];
      sections: readonly { id: string; code: string; name: string }[];
    }
  | {
      mode: 'edit';
      allocationId: string;
      initial: { allocated: string; currency: string };
    }
) {
  const router = useRouter();
  const isCreate = props.mode === 'create';
  const activeFy = isCreate ? (props.fiscalYears.find((f) => f.isActive)?.id ?? props.fiscalYears[0]?.id ?? '') : '';
  const [fiscalYearId, setFiscalYearId] = useState(activeFy);
  const [budgetHeadId, setBudgetHeadId] = useState(isCreate ? (props.budgetHeads[0]?.id ?? '') : '');
  const [sectionId, setSectionId] = useState('');
  const [allocated, setAllocated] = useState(isCreate ? '0.00' : props.initial.allocated);
  const [currency, setCurrency] = useState(isCreate ? 'PKR' : props.initial.currency);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const body = isCreate
        ? { fiscalYearId, budgetHeadId, sectionId: sectionId || null, allocated, currency }
        : { allocated, currency };
      const url = isCreate ? '/api/admin/budget-allocations' : `/api/admin/budget-allocations/${props.allocationId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/budget-allocations');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="card">
        {isCreate && (
          <>
            <div className="field">
              <label>Fiscal year</label>
              <select className="select" value={fiscalYearId} onChange={(e) => setFiscalYearId(e.target.value)} required>
                {props.fiscalYears.map((f) => <option key={f.id} value={f.id}>{f.label}{f.isActive ? ' (active)' : ''}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Budget head</label>
              <select className="select" value={budgetHeadId} onChange={(e) => setBudgetHeadId(e.target.value)} required>
                {props.budgetHeads.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.description}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Scope to section (optional)</label>
              <select className="select" value={sectionId} onChange={(e) => setSectionId(e.target.value)}>
                <option value="">— unscoped (all sections) —</option>
                {props.sections.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </select>
            </div>
          </>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="field">
            <label>Allocated amount</label>
            <input className="input" type="number" min={0} step="0.0001" value={allocated} onChange={(e) => setAllocated(e.target.value)} required />
          </div>
          <div className="field">
            <label>Currency</label>
            <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create allocation' : 'Save changes'}</button></div>
    </form>
  );
}
