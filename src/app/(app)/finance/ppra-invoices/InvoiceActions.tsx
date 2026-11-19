'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Panel = 'return' | 'send' | 'paid' | null;

/** Today as YYYY-MM-DD in the browser's local time zone (not UTC). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Per-row action buttons. Only the transitions valid for the current status are offered. */
export function InvoiceActions(props: { readonly id: string; readonly invoiceNumber: string; readonly status: string }) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>(null);
  const [date, setDate] = useState(localToday);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (props.status === 'RETURNED') return <span className="muted" style={{ fontSize: 12 }}>Final — file corrected invoice as new</span>;
  if (props.status === 'PAID') return <span className="muted" style={{ fontSize: 12 }}>—</span>;

  function open(p: Panel) {
    setPanel(p);
    setDate(localToday());
    setErr(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!panel) return;
    setBusy(true);
    setErr(null);
    const path = panel === 'return' ? 'return' : panel === 'send' ? 'send-to-dgprn' : 'mark-paid';
    const body = panel === 'return' ? { reason, returnedOn: date } : panel === 'send' ? { sentOn: date } : { paidOn: date };
    try {
      const res = await fetch(`/api/ppra-invoices/${props.id}/${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setPanel(null);
      setReason('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const dateLabel = panel === 'return' ? 'Returned on' : panel === 'send' ? 'Sent on' : 'Paid on';

  return (
    <div style={{ minWidth: 220 }}>
      {panel === null && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          {props.status === 'RECEIVED' && (
            <>
              <button type="button" className="btn" onClick={() => open('send')}>Send to DGPR(N)</button>
              <button type="button" className="btn" onClick={() => open('return')}>Return to PPRA</button>
            </>
          )}
          {props.status === 'SENT_TO_DGPRN' && (
            <button type="button" className="btn" onClick={() => open('paid')}>Mark paid</button>
          )}
        </div>
      )}
      {panel !== null && (
        <form onSubmit={submit} aria-label={`${dateLabel} — ${props.invoiceNumber}`}>
          {err && <div className="err" style={{ marginBottom: 6, fontSize: 12 }}>{err}</div>}
          {panel === 'return' && (
            <div className="field" style={{ margin: '0 0 6px' }}>
              <label htmlFor={`${props.id}-reason`}>Return reason</label>
              <textarea id={`${props.id}-reason`} className="input" rows={2} minLength={5} maxLength={5000} value={reason} onChange={(e) => setReason(e.target.value)} required />
            </div>
          )}
          <div className="field" style={{ margin: '0 0 6px' }}>
            <label htmlFor={`${props.id}-date`}>{dateLabel}</label>
            <input id={`${props.id}-date`} className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Confirm'}</button>
            <button type="button" className="btn" onClick={() => setPanel(null)} disabled={busy}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
