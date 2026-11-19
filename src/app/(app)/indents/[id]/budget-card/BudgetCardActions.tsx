'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function BudgetCardActions(props: {
  indentId: string;
  hasCard: boolean;
  isCleared: boolean;
  isCommitted: boolean;
  status: string;
  canAct: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const base = `/api/indents/${props.indentId}/budget-card`;

  async function call(path: string) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const showPrepare = props.canAct && !props.hasCard && props.status === 'BUDGET_CHECK';
  const showClear = props.canAct && props.hasCard && !props.isCleared && props.status === 'PR_ISSUED';
  const showCommit = props.canAct && props.hasCard && props.isCleared && !props.isCommitted;

  return (
    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
      {err && <div className="err" style={{ width: '100%' }}>{err}</div>}
      {showPrepare && <button className="btn btn-primary" disabled={busy} onClick={() => call(base)}>{busy ? '…' : 'Prepare Budget Card'}</button>}
      {showClear && <button className="btn btn-primary" disabled={busy} onClick={() => call(`${base}/clear`)}>{busy ? '…' : 'Mark Cleared'}</button>}
      {showCommit && <button className="btn btn-primary" disabled={busy} onClick={() => call(`${base}/commit`)}>{busy ? '…' : 'Mark Committed'}</button>}
      {props.hasCard && <button className="btn" type="button" onClick={() => window.print()}>Print</button>}
    </div>
  );
}
