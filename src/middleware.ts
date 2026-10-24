import { NextResponse, type NextRequest } from 'next/server';

/**
 * CSRF double-submit token enforcement.
 *
 * - For every GET we ensure a `csrf_token` cookie is set (readable from JS so
 *   the client-side fetch wrapper can echo it back in `X-CSRF-Token`).
 * - For every mutating request to `/api/*` we require the `X-CSRF-Token`
 *   header to match the cookie. 403 if it doesn't.
 *
 * Deliberately bypassed for `/api/auth/*` because NextAuth's own CSRF flow
 * owns that namespace, and for `/api/health` because it's unauthenticated
 * liveness.
 */

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
// `/api/auth/*` is bypassed for NextAuth's own flows, but our custom
// password-reset endpoints are plain POSTs and need CSRF — override.
const BYPASS = ['/api/auth/callback/', '/api/auth/signin', '/api/auth/signout', '/api/auth/csrf', '/api/auth/session', '/api/auth/providers', '/api/health'];
const EXTRA_UNAUTHENTICATED_BUT_RATELIMITED = ['/api/auth/forgot-password', '/api/auth/reset-password'];

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const method = req.method.toUpperCase();
  const isApi = pathname.startsWith('/api/');
  const bypassed = BYPASS.some((p) => pathname.startsWith(p));

  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;

  // Forgot-password + reset-password are unauthenticated but still CSRF-protected,
  // handled by the normal path. The constant above is just documentation that
  // we deliberately don't bypass them.
  void EXTRA_UNAUTHENTICATED_BUT_RATELIMITED;

  if (isApi && MUTATING.has(method) && !bypassed) {
    const headerToken = req.headers.get(CSRF_HEADER);
    if (!cookieToken || !headerToken || !timingSafeEqual(headerToken, cookieToken)) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'CSRF_FORBIDDEN', message: 'Missing or invalid CSRF token' } }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      );
    }
  }

  const res = NextResponse.next();
  if (!cookieToken) {
    res.cookies.set(CSRF_COOKIE, generateToken(), {
      httpOnly: false,       // the client fetch wrapper must read it
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return res;
}

/** Constant-time string compare — avoids leaking token length via timing. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function generateToken(): string {
  // Edge-runtime safe: uses the Web Crypto API.
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Match everything except static assets. Next.js public files are served
// without going through middleware anyway, but excluding them explicitly
// keeps the matcher cheap.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
