'use client';
import { useState, type FormEvent } from 'react';

export function ResetPasswordForm({ id, token }: { id: string; token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    if (password.length < 10) { setErr('Password must be at least 10 characters.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, token, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  if (done) {
    return (
      <div className="err" style={{ background: 'rgba(46,160,67,0.15)', color: '#4ade80', borderColor: 'rgba(46,160,67,0.4)' }}>
        Password updated. You can now <a href="/signin">sign in</a> with your new password.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label htmlFor="password">New password</label>
        <input id="password" className="input" type="password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" className="input" type="password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
