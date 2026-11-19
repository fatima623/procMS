'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, localToday, postJson } from './postJson';

/** Per-objection actions: OPEN → Reply (text + date); REPLIED → Settle. */
export function ObjectionActions(props: { readonly recordId: string; readonly objectionId: string; readonly para: string; readonly status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [repliedOn, setRepliedOn] = useState(localToday);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = `/api/audit-records/${props.recordId}/objections/${props.objectionId}`;

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setErr(null);
    try {
      await fn();
      setOpen(false);
      setReplyText('');
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (props.status === 'SETTLED') return <span className="muted">—</span>;

  return (
    <div style={{ minWidth: 200 }}>
      {err && <div className="err" style={{ marginBottom: 6, fontSize: 12 }}>{err}</div>}
      {props.status === 'REPLIED' && (
        <button type="button" className="btn" disabled={busy} onClick={() => act(() => postJson(`${base}/settle`))}>Settle</button>
      )}
      {props.status === 'OPEN' && !open && (
        <button type="button" className="btn" onClick={() => { setOpen(true); setRepliedOn(localToday()); }}>Reply</button>
      )}
      {props.status === 'OPEN' && open && (
        <form onSubmit={(e) => { e.preventDefault(); void act(() => postJson(`${base}/reply`, { replyText, repliedOn })); }} aria-label={`Reply to para ${props.para}`}>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label htmlFor={`${props.objectionId}-reply`}>Reply</label>
            <textarea id={`${props.objectionId}-reply`} className="input" rows={2} minLength={2} maxLength={10000} value={replyText} onChange={(e) => setReplyText(e.target.value)} required />
          </div>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label htmlFor={`${props.objectionId}-repliedOn`}>Replied on</label>
            <input id={`${props.objectionId}-repliedOn`} className="input" type="date" value={repliedOn} onChange={(e) => setRepliedOn(e.target.value)} required />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Save reply'}</button>
            <button type="button" className="btn" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
