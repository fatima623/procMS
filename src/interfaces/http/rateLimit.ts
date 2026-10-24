import { NextResponse, type NextRequest } from 'next/server';
import { rateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';

export interface EnforceRateLimitOpts {
  readonly key: string;
  readonly limit: number;
  readonly windowSeconds: number;
}

/**
 * Check a limiter and, if the request should be refused, return a 429
 * NextResponse ready to be returned from the handler. Returns null when the
 * request is allowed.
 */
export async function enforceRateLimit(opts: EnforceRateLimitOpts): Promise<NextResponse | null> {
  const decision = await rateLimiter.tryConsume(opts.key, { limit: opts.limit, windowSeconds: opts.windowSeconds });
  if (decision.allowed) return null;
  return new NextResponse(
    JSON.stringify({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Retry in ${decision.retryAfterSeconds}s.`,
      },
    }),
    {
      status: 429,
      headers: {
        'content-type': 'application/json',
        'Retry-After': String(decision.retryAfterSeconds),
        'X-RateLimit-Limit': String(decision.limit),
        'X-RateLimit-Remaining': String(decision.remaining),
      },
    },
  );
}

/** Extract a best-effort client IP from Next.js request headers. */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}
