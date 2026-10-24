'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SectionKind } from '@prisma/client';

const KINDS: SectionKind[] = [
  SectionKind.INDENTER, SectionKind.CR, SectionKind.BUDGET, SectionKind.COORD,
  SectionKind.ADP, SectionKind.SUPTD, SectionKind.DP_OFFICE, SectionKind.INSPECTORATE, SectionKind.OTHER,
];

interface Parent { id: string; code: string; name: string; }

export function SectionForm(props:
  | { mode: 'create'; parents: readonly Parent[]; }
  | {
      mode: 'edit'; sectionId: string; parents: readonly Parent[];
      initial: { code: string; name: string; kind: SectionKind; parentId: string; isActive: boolean };
    }
) {
  const router = useRouter();
  const isCreate = props.mode === 'create';
  const [code, setCode] = useState(isCreate ? '' : props.initial.code);
  const [name, setName] = useState(isCreate ? '' : props.initial.name);
  const [kind, setKind] = useState<SectionKind>(isCreate ? SectionKind.OTHER : props.initial.kind);
  const [parentId, setParentId] = useState(isCreate ? '' : props.initial.parentId);
  const [isActive, setIsActive] = useState(isCreate ? true : props.initial.isActive);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const body = { code, name, kind, parentId: parentId || null, isActive };
      const url = isCreate ? '/api/admin/sections' : `/api/admin/sections/${props.sectionId}`;
      const method = isCreate ? 'POST' : 'PATCH';
      const res = await fetch(url, { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.push('/admin/sections');
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div className="field">
            <label>Code</label>
            <input className="input mono" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required pattern="[A-Z0-9][A-Z0-9-]*" />
          </div>
          <div className="field">
            <label>Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
          <div className="field">
            <label>Kind</label>
            <select className="select" value={kind} onChange={(e) => setKind(e.target.value as SectionKind)}>
              {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Parent (optional)</label>
            <select className="select" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— none —</option>
              {props.parents.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="field">
          <label><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
        </div>
      </div>
      <div className="row row-end"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : isCreate ? 'Create section' : 'Save changes'}</button></div>
    </form>
  );
}
