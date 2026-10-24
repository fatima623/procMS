'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { MultiSelect, type MultiSelectOption } from '@/interfaces/ui/components/MultiSelect';

export function NewITForm({
  indentId,
  firms,
}: {
  readonly indentId: string;
  readonly firms: readonly { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [reference, setReference] = useState(`IT/${new Date().getUTCFullYear()}/`);
  const [checklistComplete, setChecklistComplete] = useState(true);
  const [checklistBudget, setChecklistBudget] = useState(true);
  const [invited, setInvited] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const firmOptions: MultiSelectOption[] = firms.map((f) => ({ value: f.id, label: f.name, hint: f.code }));

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (invited.length === 0) { setErr('Invite at least one firm.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/it-proformas', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          indentId,
          reference,
          checklist: { completeness: checklistComplete, budgetVerified: checklistBudget },
          invitedFirmIds: invited,
        }),
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
      <div className="card">
        <h3>Reference</h3>
        <div className="field">
          <label>IT reference</label>
          <input className="input mono" value={reference} onChange={(e) => setReference(e.target.value)} required />
        </div>
        <h3>Checklist</h3>
        <label style={{ display: 'block' }}><input type="checkbox" checked={checklistComplete} onChange={(e) => setChecklistComplete(e.target.checked)} /> Technical spec is complete</label>
        <label style={{ display: 'block', marginTop: 6 }}><input type="checkbox" checked={checklistBudget} onChange={(e) => setChecklistBudget(e.target.checked)} /> Budget verified</label>
      </div>

      <div className="card">
        <h3>Invite firms ({invited.length} selected)</h3>
        <div className="field">
          <label>Firms to invite</label>
          <MultiSelect
            options={firmOptions}
            selected={invited}
            onChange={setInvited}
            placeholder="Click to add firms…"
          />
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Type to search by firm name or code.
          </div>
        </div>
      </div>

      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create IT'}</button></div>
    </form>
  );
}
