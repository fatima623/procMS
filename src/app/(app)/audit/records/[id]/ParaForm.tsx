'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, localToday, postJson } from './postJson';

/** Add a draft para under one of the record's items. */
export function ParaForm(props: { readonly recordId: string; readonly items: readonly { id: string; label: string }[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState(props.items[0]?.id ?? '');
  const [paraText, setParaText] = useState('');
  const [submittedOn, setSubmittedOn] = useState(localToday);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJson(`/api/audit-records/${props.recordId}/items/${itemId}/paras`, { paraText, submittedOn });
      setParaText('');
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>Add draft para</h3>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 12 }}>
        <div className="field" style={{ flex: 2 }}>
          <label htmlFor="paraItem">Audit item</label>
          <select id="paraItem" className="select" value={itemId} onChange={(e) => setItemId(e.target.value)} required>
            {props.items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
          </select>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="paraSubmittedOn">Submitted on</label>
          <input id="paraSubmittedOn" className="input" type="date" value={submittedOn} onChange={(e) => setSubmittedOn(e.target.value)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="paraText">Draft para text</label>
        <textarea id="paraText" className="input" rows={4} minLength={2} maxLength={20000} value={paraText} onChange={(e) => setParaText(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy || !itemId}>{busy ? '…' : 'Add draft para'}</button>
    </form>
  );
}
