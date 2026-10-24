import type { NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { ForbiddenError } from '@/domain/errors/DomainError';
import type { AuthContext } from '@/application/ports/AuthContext';
import { rateLimiter } from '@/infrastructure/ratelimit/InMemoryRateLimiter';

export class RateLimitedError extends ForbiddenError {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Rate limit exceeded. Retry in ${retryAfterSeconds}s.`);
  }
}

/**
 * Resolve the authenticated principal from the request.
 *
 * This is a thin shim over NextAuth; it reads the session JWT and projects
 * the fields the application layer needs. If the token is missing or
 * invalid, it throws ForbiddenError — the HTTP error mapper renders a 403.
 *
 * NOTE: NextAuth v5 is beta; the exact import path and session shape may
 * change. Keep this guard the single place that touches NextAuth so route
 * handlers remain framework-agnostic.
 */
export async function requireAuth(_req: NextRequest, requiredRoles?: Role[]): Promise<AuthContext> {
  // Lazy import to avoid pulling NextAuth into edge bundles that don't need it.
  const { auth } = await import('@/infrastructure/auth/nextauth');
  const session = await auth();
  if (!session?.user) {
    throw new ForbiddenError('Authentication required');
  }

  // Per-user API throttle. Generous default to avoid hampering legitimate use;
  // specific routes (upload, sign-in) layer tighter limits of their own.
  const decision = await rateLimiter.tryConsume(`api:${session.user.id}`, {
    limit: 300,
    windowSeconds: 60,
  });
  if (!decision.allowed) {
    throw new RateLimitedError(decision.retryAfterSeconds);
  }

  const ctx: AuthContext = {
    userId: session.user.id,
    roles: session.user.roles as Role[],
    sectionIds: session.user.sectionIds ?? [],
    ...(session.user.firmId ? { firmId: session.user.firmId } : {}),
  };

  if (requiredRoles && requiredRoles.length > 0) {
    const ok = requiredRoles.some((r) => ctx.roles.includes(r));
    if (!ok) throw new ForbiddenError(`Requires one of: ${requiredRoles.join(', ')}`);
  }
  return ctx;
}
