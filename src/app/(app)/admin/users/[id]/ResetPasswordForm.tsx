'use client';
import { useState, type FormEvent } from 'react';

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setOk(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setOk(true);
      setPassword('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      {ok && <div className="err" style={{ background: 'rgba(46,160,67,0.15)', color: '#4ade80', borderColor: 'rgba(46,160,67,0.4)' }}>Password updated.</div>}
      <div className="field">
        <label>New password (min 10 chars)</label>
        <input className="input" type="password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="row row-end"><button className="btn btn-danger" type="submit" disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</button></div>
    </form>
  );
}
