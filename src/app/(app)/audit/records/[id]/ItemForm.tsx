'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, postJson } from './postJson';

/** Add an audit item to an OPEN audit record. */
export function ItemForm({ recordId }: { readonly recordId: string }) {
  const router = useRouter();
  const [itemText, setItemText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJson(`/api/audit-records/${recordId}/items`, { itemText });
      setItemText('');
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>Add item</h3>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="field">
        <label htmlFor="itemText">Item text</label>
        <textarea id="itemText" className="input" rows={3} minLength={2} maxLength={10000} value={itemText} onChange={(e) => setItemText(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Add item'}</button>
    </form>
  );
}
