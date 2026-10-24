'use client';
import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';

export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        totp: totp.trim(),
        redirect: false,
        callbackUrl,
      });
      if (res?.error) {
        setErr('Invalid email, password, or 2FA code.');
      } else if (res?.url) {
        window.location.href = res.url;
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setErr('Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="err">{err}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" className="input" type="email" autoComplete="username"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" className="input" type="password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="totp">2FA code <span className="muted" style={{ fontWeight: 400 }}>(leave blank if not enrolled)</span></label>
        <input id="totp" className="input mono" inputMode="numeric" pattern="\d{6}" maxLength={6}
          value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="123456" autoComplete="one-time-code" />
      </div>
      <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>
        {submitting ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
