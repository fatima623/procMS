'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, postJson } from './postJson';

/**
 * Per-item actions: AWAITED → Reply (text); REPLY → Clear; plus "link to
 * objection" (only objections of this record not already linked).
 */
export function ItemActions(props: {
  readonly recordId: string;
  readonly itemId: string;
  readonly status: string;
  readonly linkableObjections: readonly { id: string; label: string }[];
}) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [objectionId, setObjectionId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = `/api/audit-records/${props.recordId}/items/${props.itemId}`;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setReplyOpen(false);
      setReplyText('');
      setObjectionId('');
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minWidth: 220 }}>
      {err && <div className="err" style={{ marginBottom: 6, fontSize: 12 }}>{err}</div>}

      {props.status === 'REPLY' && (
        <button type="button" className="btn" disabled={busy} onClick={() => act(() => postJson(`${base}/clear`))}>Clear</button>
      )}
      {props.status === 'AWAITED' && !replyOpen && (
        <button type="button" className="btn" onClick={() => setReplyOpen(true)}>Reply</button>
      )}
      {props.status === 'AWAITED' && replyOpen && (
        <form onSubmit={(e) => { e.preventDefault(); void act(() => postJson(`${base}/reply`, { replyText })); }}>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label htmlFor={`${props.itemId}-reply`}>Reply</label>
            <textarea id={`${props.itemId}-reply`} className="input" rows={2} minLength={2} maxLength={10000} value={replyText} onChange={(e) => setReplyText(e.target.value)} required />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Save reply'}</button>
            <button type="button" className="btn" disabled={busy} onClick={() => setReplyOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      {props.linkableObjections.length > 0 && (
        <form
          onSubmit={(e) => { e.preventDefault(); void act(() => postJson(`${base}/links`, { auditObjectionId: objectionId })); }}
          className="row"
          style={{ gap: 6, marginTop: 8, alignItems: 'flex-end' }}
        >
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor={`${props.itemId}-link`}>Link to objection</label>
            <select id={`${props.itemId}-link`} className="select" value={objectionId} onChange={(e) => setObjectionId(e.target.value)} required>
              <option value="">— Select para —</option>
              {props.linkableObjections.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
          <button type="submit" className="btn" disabled={busy || !objectionId}>Link</button>
        </form>
      )}
    </div>
  );
}
