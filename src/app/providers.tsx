'use client';
import { SessionProvider } from 'next-auth/react';
import { useEffect, type ReactNode } from 'react';

/**
 * Required for next-auth/react hooks (signIn / signOut) in client components.
 *
 * Also installs a one-shot `fetch` wrapper that auto-attaches the CSRF
 * double-submit token on mutating requests. This way every client component
 * can keep calling the global `fetch` as before — no per-call changes.
 */
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch.bind(window);
    const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

    window.fetch = (input, init = {}) => {
      try {
        const method = String(init.method ?? 'GET').toUpperCase();
        if (MUTATING.has(method)) {
          const token = readCookie('csrf_token');
          if (token) {
            const headers = new Headers(init.headers ?? {});
            if (!headers.has('x-csrf-token')) {
              headers.set('x-csrf-token', token);
            }
            init.headers = headers;
          }
        }
      } catch { /* fall through */ }
      return originalFetch(input, init);
    };

    return () => { window.fetch = originalFetch; };
  }, []);

  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\\/+^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]!) : null;
}
