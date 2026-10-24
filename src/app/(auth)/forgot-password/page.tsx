import { ForgotPasswordForm } from './ForgotPasswordForm';
import Link from 'next/link';

export const metadata = { title: 'Forgot password • Procurement' };

export default function ForgotPasswordPage() {
  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Forgot password</h1>
        <p className="muted" style={{ marginTop: 0 }}>We'll email you a reset link if an account with that address exists.</p>
        <ForgotPasswordForm />
        <p style={{ marginTop: 16, fontSize: 13 }}>
          <Link href="/signin">← Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
