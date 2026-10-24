'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

type Fields = { label: string; startsOn: string; endsOn: string; isActive: boolean };

const BLANK: Fields = { label: '', startsOn: '', endsOn: '', isActive: false };

export function FiscalYearForm(props:
  | { mode: 'create' }
  | { mode: 'edit'; fiscalYearId: string; initial: Fields }
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
      const body = { label: f.label, startsOn: f.startsOn, endsOn: f.endsOn, isActive: f.isActive };
      const url = isCreate ? '/api/admin/fiscal-years' : `/api/admin/fiscal-years/${props.fiscalYearId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/fiscal-years');
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
          <label>Label</label>
          <input className="input mono" value={f.label} onChange={(e) => set('label', e.target.value)} required placeholder="e.g. 2026-27" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="field"><label>Starts on</label><input className="input" type="date" value={f.startsOn} onChange={(e) => set('startsOn', e.target.value)} required /></div>
          <div className="field"><label>Ends on</label><input className="input" type="date" value={f.endsOn} onChange={(e) => set('endsOn', e.target.value)} required /></div>
        </div>
        <div className="field">
          <label><input type="checkbox" checked={f.isActive} onChange={(e) => set('isActive', e.target.checked)} /> Set as active (deactivates any current active year)</label>
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create fiscal year' : 'Save changes'}</button></div>
    </form>
  );
}
