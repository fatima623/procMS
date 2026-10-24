'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Fields = { code: string; description: string; isActive: boolean };
const BLANK: Fields = { code: '', description: '', isActive: true };

export function BudgetHeadForm(props:
  | { mode: 'create' }
  | { mode: 'edit'; budgetHeadId: string; initial: Fields }
) {
  const router = useRouter();
  const isCreate = props.mode === 'create';
  const [f, setF] = useState<Fields>(isCreate ? BLANK : props.initial);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof Fields>(k: K, v: Fields[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = { code: f.code, description: f.description, isActive: f.isActive };
      const url = isCreate ? '/api/admin/budget-heads' : `/api/admin/budget-heads/${props.budgetHeadId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/budget-heads');
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
      <div className="card">
        <div className="field">
          <label>Code</label>
          <input className="input mono" value={f.code} onChange={(e) => set('code', e.target.value.toUpperCase())} required pattern="[A-Z0-9][A-Z0-9-]*" />
        </div>
        <div className="field">
          <label>Description</label>
          <input className="input" value={f.description} onChange={(e) => set('description', e.target.value)} required />
        </div>
        <div className="field">
          <label><input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Active</label>
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create budget head' : 'Save changes'}</button></div>
    </form>
  );
}
