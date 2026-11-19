'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function MinuteForm({ correspondenceId }: { readonly correspondenceId: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<'IMF' | 'EMF'>('IMF');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/correspondence/${correspondenceId}/minutes`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, text }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      setText('');
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 14 }}>
      {err && <div className="err" style={{ marginBottom: 8 }}>{err}</div>}
      <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
        <select aria-label="Minute kind" className="select" value={kind} onChange={(e) => setKind(e.target.value as 'IMF' | 'EMF')} style={{ width: 110 }}>
          <option value="IMF">IMF</option>
          <option value="EMF">EMF</option>
        </select>
        <textarea aria-label="Minute text" className="input" rows={2} minLength={2} maxLength={5000} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Forwarded to DD for action" required style={{ flex: 1 }} />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '…' : 'Add minute'}</button>
      </div>
    </form>
  );
}
