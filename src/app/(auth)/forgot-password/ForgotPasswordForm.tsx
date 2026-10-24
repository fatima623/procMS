'use client';
import { useState, type FormEvent } from 'react';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      setSubmitted(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  if (submitted) {
    return (
      <div className="err" style={{ background: 'rgba(46,160,67,0.15)', color: '#4ade80', borderColor: 'rgba(46,160,67,0.4)' }}>
        If that email is on file, a reset link is on its way. Check your inbox (and your spam folder). The link is valid for one hour.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
        {busy ? 'Sending…' : 'Email reset link'}
      </button>
    </form>
  );
}
