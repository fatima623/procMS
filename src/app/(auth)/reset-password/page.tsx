import { ResetPasswordForm } from './ResetPasswordForm';
import Link from 'next/link';

export const metadata = { title: 'Reset password • Procurement' };

export default function ResetPasswordPage({ searchParams }: { searchParams: { token?: string; id?: string } }) {
  const token = searchParams.token ?? '';
  const id = searchParams.id ?? '';
  const linkValid = /^[a-f0-9]{64}$/.test(token) && /^[A-Z0-9]{26}$/.test(id);

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Reset password</h1>
        {linkValid ? (
          <>
            <p className="muted" style={{ marginTop: 0 }}>Pick a new password of at least 10 characters.</p>
            <ResetPasswordForm id={id} token={token} />
          </>
        ) : (
          <div className="err">This reset link looks malformed. Request a new one from the <Link href="/forgot-password">forgot-password page</Link>.</div>
        )}
      </div>
    </main>
  );
}
