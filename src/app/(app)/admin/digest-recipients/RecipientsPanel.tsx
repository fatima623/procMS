'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export function RecipientsPanel() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/admin/digest-recipients', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, label: label || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setEmail(''); setLabel('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function sendNow() {
    if (!confirm('Send the weekly digest now, using the current recipient list?')) return;
    setSendBusy(true); setSendMsg(null);
    try {
      const res = await fetch('/api/jobs/digest/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setSendMsg(`Sent to ${data?.data?.recipients ?? 0} recipient(s).`);
    } catch (e) {
      setSendMsg(e instanceof Error ? e.message : String(e));
    } finally { setSendBusy(false); }
  }

  return (
    <section className="card">
      {err && <div className="err">{err}</div>}
      <form onSubmit={add}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 10, alignItems: 'end' }}>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="r-email">Email</label>
            <input id="r-email" className="input mono" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="observer@dp.navy" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="r-label">Label (optional)</label>
            <input id="r-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Audit team" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Adding…' : '+ Add recipient'}</button>
          <button className="btn" type="button" onClick={sendNow} disabled={sendBusy} title="Trigger the weekly digest job now">
            {sendBusy ? 'Sending…' : 'Send now ✉'}
          </button>
        </div>
      </form>
      {sendMsg && <div className="muted" style={{ marginTop: 10, fontSize: 13 }}>{sendMsg}</div>}
    </section>
  );
}
