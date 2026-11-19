'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, postJson } from './postJson';

/** Close / Settle buttons for an OPEN audit record. */
export function RecordActions({ recordId }: { readonly recordId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run(action: 'close' | 'settle') {
    const msg = action === 'close'
      ? 'Close this audit record? No further changes will be possible.'
      : 'Settle this audit record? All objections must be settled and all items cleared. No further changes will be possible.';
    if (!window.confirm(msg)) return;
    setBusy(true);
    setErr(null);
    try {
      await postJson(`/api/audit-records/${recordId}/${action}`);
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 8 }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run('settle')}>Settle record</button>
        <button type="button" className="btn" disabled={busy} onClick={() => run('close')}>Close record</button>
      </div>
    </div>
  );
}
