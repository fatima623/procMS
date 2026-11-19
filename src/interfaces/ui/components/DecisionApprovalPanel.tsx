'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateLabel } from './DateLabel';
import { StatusPill } from './StatusPill';

export interface DecisionApprovalEventProp {
  readonly id: string;
  readonly action: 'APPROVE' | 'UN_APPROVE';
  readonly decidedOn: string;
  readonly decidedByName: string | null;
  readonly remarks: string | null;
}

/**
 * Decision Approval (Communication Section lock) — status badge, Lock /
 * Un-Approve button (for DECISION_ROLES) and history. `compact` renders only
 * the button(s), for a table row.
 */
export function DecisionApprovalPanel(props: {
  readonly subjectType: 'INDENT' | 'CONTRACT';
  readonly subjectId: string;
  /** Indent / contract number, for confirmations. */
  readonly label: string;
  readonly locked: boolean;
  readonly events: readonly DecisionApprovalEventProp[];
  readonly canAct: boolean;
  readonly compact?: boolean;
}) {
  const router = useRouter();
  const [remarksOpen, setRemarksOpen] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const noun = props.subjectType === 'INDENT' ? 'indent' : 'contract';
  const url = `/api/${props.subjectType === 'INDENT' ? 'indents' : 'contracts'}/${props.subjectId}/decision-approval`;
  const fieldId = `decision-remarks-${props.subjectId}`;

  async function send(action: 'APPROVE' | 'UN_APPROVE') {
    if (action === 'APPROVE' && !window.confirm(`Lock ${noun} ${props.label} from further edits?`)) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, remarks: remarks.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setRemarks('');
      setRemarksOpen(false);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const controls = props.canAct && (
    <div>
      {err && <div className="err" style={{ marginBottom: 6, fontSize: 12 }}>{err}</div>}
      {!remarksOpen ? (
        <div className="row" style={{ gap: 6 }}>
          {props.locked ? (
            <button type="button" className="btn" disabled={busy} onClick={() => setRemarksOpen(true)}>Un-Approve</button>
          ) : props.compact ? (
            <button type="button" className="btn" disabled={busy} onClick={() => send('APPROVE')}>{busy ? '…' : 'Lock'}</button>
          ) : (
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => setRemarksOpen(true)}>Lock from further edits</button>
          )}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void send(props.locked ? 'UN_APPROVE' : 'APPROVE'); }}>
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label htmlFor={fieldId}>{props.locked ? 'Un-Approve remarks (required)' : 'Remarks (optional)'}</label>
            <textarea
              id={fieldId}
              className="input"
              rows={2}
              maxLength={5000}
              minLength={props.locked ? 5 : undefined}
              required={props.locked}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : props.locked ? 'Confirm Un-Approve' : 'Confirm lock'}</button>
            <button type="button" className="btn" disabled={busy} onClick={() => { setRemarksOpen(false); setErr(null); }}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );

  if (props.compact) return controls || null;

  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="row" style={{ gap: 10, marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Decision Approval</h3>
        {props.locked
          ? <StatusPill tone="warn">🔒 Locked — no further edits</StatusPill>
          : <StatusPill tone="default">Not locked</StatusPill>}
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Communication Section lock. It does not change the {noun}&apos;s status; Un-Approve releases it. Comments and attachments stay open.
      </p>
      {controls}
      {props.events.length > 0 && (
        <table className="table" style={{ marginTop: 12 }}>
          <thead><tr><th>Action</th><th>By</th><th>On</th><th>Remarks</th></tr></thead>
          <tbody>
            {props.events.map((e) => (
              <tr key={e.id}>
                <td>{e.action === 'APPROVE' ? 'Locked (Approve)' : 'Un-Approved'}</td>
                <td>{e.decidedByName ?? '—'}</td>
                <td><DateLabel iso={e.decidedOn} /></td>
                <td style={{ whiteSpace: 'pre-wrap' }}>{e.remarks ?? <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
