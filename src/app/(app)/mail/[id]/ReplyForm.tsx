'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ReplyForm({ messageId }: { readonly messageId: string }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/messages/${messageId}/reply`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setBody('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="field">
        <label htmlFor="replyBody">Reply message</label>
        <textarea id="replyBody" className="input" rows={4} maxLength={20000} value={body} onChange={(e) => setBody(e.target.value)} required />
      </div>
      <div className="row row-end" style={{ marginTop: 8 }}>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Send reply'}</button>
      </div>
    </form>
  );
}
