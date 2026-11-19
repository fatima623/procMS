'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function ComposeForm({ users }: { readonly users: readonly { id: string; label: string }[] }) {
  const router = useRouter();
  const [toUserId, setToUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ toUserId, subject, body }),
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { id?: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      router.push(data.data?.id ? `/mail/${data.data.id}` : '/mail/sent');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, maxWidth: 760 }}>
      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}
      <div className="field">
        <label htmlFor="toUserId">To</label>
        <select id="toUserId" className="select" value={toUserId} onChange={(e) => setToUserId(e.target.value)} required>
          <option value="">— Select recipient —</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="subject">Subject</label>
        <input id="subject" className="input" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required />
      </div>
      <div className="field">
        <label htmlFor="body">Message</label>
        <textarea id="body" className="input" rows={8} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} required />
      </div>
      <div className="row row-end" style={{ marginTop: 16, gap: 8 }}>
        <Link href="/mail/inbox" className="btn">Cancel</Link>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Send'}</button>
      </div>
    </form>
  );
}
