'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { errorMessage, postJson } from './postJson';

/** Add an objection to an OPEN audit record. */
export function ObjectionForm({ recordId }: { readonly recordId: string }) {
  const router = useRouter();
  const [para, setPara] = useState('');
  const [ground, setGround] = useState('');
  const [amountInvolved, setAmountInvolved] = useState('');
  const [currency, setCurrency] = useState('PKR');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await postJson(`/api/audit-records/${recordId}/objections`, {
        para,
        ground,
        amountInvolved: amountInvolved.trim() || undefined,
        currency: amountInvolved.trim() ? currency : undefined,
      });
      setPara('');
      setGround('');
      setAmountInvolved('');
      router.refresh();
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <h3 style={{ margin: '0 0 8px' }}>Add objection</h3>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
        <div className="field" style={{ width: 160 }}>
          <label htmlFor="objPara">Para no.</label>
          <input id="objPara" className="input mono" value={para} onChange={(e) => setPara(e.target.value)} maxLength={40} required />
        </div>
        <div className="field" style={{ width: 220 }}>
          <label htmlFor="objAmount">Amount involved (optional)</label>
          <input id="objAmount" className="input mono" inputMode="decimal" value={amountInvolved} onChange={(e) => setAmountInvolved(e.target.value)} pattern="\d{1,14}(\.\d{1,4})?" title="Digits only (max 14), up to 4 decimal places" />
        </div>
        <div className="field" style={{ width: 100 }}>
          <label htmlFor="objCurrency">Currency</label>
          <input id="objCurrency" className="input mono" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} minLength={3} maxLength={3} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="objGround">Ground of objection</label>
        <textarea id="objGround" className="input" rows={3} minLength={5} maxLength={10000} value={ground} onChange={(e) => setGround(e.target.value)} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Add objection'}</button>
    </form>
  );
}
