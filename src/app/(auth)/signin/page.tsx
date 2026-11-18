import { auth } from '@/infrastructure/auth/nextauth';
import { redirect } from 'next/navigation';
import { SignInForm } from './SignInForm';

export const metadata = { title: 'Sign in • Procurement' };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await auth();
  if (session?.user) redirect(params.callbackUrl ?? '/dashboard');

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 28 }}>
        <h1 style={{ marginBottom: 4 }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 0, marginBottom: 20 }}>Procurement Management System</p>
        {params.error && (
          <div className="err">
            {params.error === 'CredentialsSignin'
              ? 'Invalid email or password.'
              : 'Sign-in failed. Please try again.'}
          </div>
        )}
        <SignInForm callbackUrl={params.callbackUrl ?? '/dashboard'} />
        <p style={{ marginTop: 16, fontSize: 13, textAlign: 'center' }}>
          <a href="/forgot-password">Forgot password?</a>
        </p>
      </div>
    </main>
  );
}
