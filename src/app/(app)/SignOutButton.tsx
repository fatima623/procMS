'use client';
import { signOut } from 'next-auth/react';

export function SignOutButton() {
  return (
    <button
      className="btn btn-ghost"
      onClick={() => signOut({ callbackUrl: '/signin' })}
      aria-label="Sign out"
    >
      Sign out
    </button>
  );
}
