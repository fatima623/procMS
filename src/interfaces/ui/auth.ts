import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { auth } from '@/infrastructure/auth/nextauth';
import type { AuthContext } from '@/application/ports/AuthContext';

/**
 * SSR auth helper for server components. Resolves the session and projects
 * it to an AuthContext (same shape the application layer expects). Redirects
 * to the sign-in page when there is no session, so callers can treat the
 * returned context as always-present.
 */
export async function requireSessionCtx(redirectTo = '/signin'): Promise<AuthContext> {
  const session = await auth();
  if (!session?.user) {
    redirect(redirectTo);
  }
  return {
    userId: session.user.id,
    roles: (session.user.roles ?? []) as Role[],
    sectionIds: session.user.sectionIds ?? [],
    ...(session.user.firmId ? { firmId: session.user.firmId } : {}),
  };
}

/** Returns the current session's impersonation shim or null. */
export async function currentImpersonation(): Promise<{ impersonatedByEmail: string | null; targetEmail: string | null } | null> {
  const session = await auth();
  if (!session?.user) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const impersonatedBy = (session as any).impersonatedBy as string | undefined;
  if (!impersonatedBy) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const impersonatedByEmail = (session as any).impersonatedByEmail as string | null | undefined;
  return {
    impersonatedByEmail: impersonatedByEmail ?? null,
    targetEmail: session.user.email ?? null,
  };
}

/** Shortcut when a page needs to gate on specific roles. */
export async function requireRoles(roles: Role[], redirectTo = '/dashboard'): Promise<AuthContext> {
  const ctx = await requireSessionCtx();
  const ok = roles.some((r) => ctx.roles.includes(r));
  if (!ok) redirect(redirectTo);
  return ctx;
}
