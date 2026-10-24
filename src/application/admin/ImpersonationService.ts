import { encode } from 'next-auth/jwt';
import { ulid } from 'ulid';
import { prisma } from '@/infrastructure/db/prisma';
import {
  BusinessRuleViolationError,
  ForbiddenError,
  NotFoundError,
} from '@/domain/errors/DomainError';
import type { Role } from '@prisma/client';
import type { AuthContext } from '../ports/AuthContext';

export interface ImpersonationToken {
  readonly cookieValue: string;
  readonly maxAgeSeconds: number;
}

/**
 * Build a NextAuth session JWT impersonating `targetUserId`. The resulting
 * token embeds `impersonatedBy` + `impersonatedByEmail` so the UI can show
 * a banner and the Stop endpoint knows who to restore.
 *
 * We use the raw `encode()` helper so we can forge the token server-side
 * without round-tripping through the Credentials provider.
 */
export class ImpersonationService {
  private readonly secret = process.env.NEXTAUTH_SECRET ?? '';
  private readonly salt = 'authjs.session-token';
  private readonly maxAge = 60 * 60; // 1 hour impersonation window

  public async beginImpersonation(ctx: AuthContext, targetUserId: string): Promise<ImpersonationToken> {
    if (!ctx.roles.includes('ADMIN' as Role)) {
      throw new ForbiddenError('Only admins may impersonate');
    }
    if (targetUserId === ctx.userId) {
      throw new BusinessRuleViolationError('Already signed in as this user');
    }
    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { roles: true, memberships: true },
    });
    if (!target || !target.isActive) throw new NotFoundError('User', targetUserId);

    const admin = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true } });

    const token = await encode({
      token: {
        name: target.displayName,
        email: target.email,
        sub: target.id,
        userId: target.id,
        roles: target.roles.map((r) => r.role) as unknown as Role[],
        sectionIds: target.memberships.map((m) => m.sectionId),
        firmId: target.firmId ?? undefined,
        impersonatedBy: ctx.userId,
        impersonatedByEmail: admin?.email ?? null,
      },
      secret: this.secret,
      salt: this.salt,
      maxAge: this.maxAge,
    });

    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: ctx.userId,
        action: 'admin.impersonate.start',
        subjectType: 'USER', subjectId: target.id,
        metadata: { targetEmail: target.email } as never,
      },
    });

    return { cookieValue: token, maxAgeSeconds: this.maxAge };
  }

  public async stopImpersonation(impersonatedByUserId: string, currentTargetId: string): Promise<ImpersonationToken> {
    const admin = await prisma.user.findUnique({
      where: { id: impersonatedByUserId },
      include: { roles: true, memberships: true },
    });
    if (!admin || !admin.isActive) throw new ForbiddenError('Original admin account no longer active');

    const token = await encode({
      token: {
        name: admin.displayName,
        email: admin.email,
        sub: admin.id,
        userId: admin.id,
        roles: admin.roles.map((r) => r.role) as unknown as Role[],
        sectionIds: admin.memberships.map((m) => m.sectionId),
        firmId: admin.firmId ?? undefined,
      },
      secret: this.secret,
      salt: this.salt,
      maxAge: 14 * 24 * 60 * 60,
    });

    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: admin.id,
        action: 'admin.impersonate.stop',
        subjectType: 'USER', subjectId: currentTargetId,
      },
    });

    return { cookieValue: token, maxAgeSeconds: 14 * 24 * 60 * 60 };
  }
}

export const impersonationService = new ImpersonationService();

/** Decide which cookie name the session is riding on in this environment. */
export function sessionCookieName(): string {
  return process.env.NODE_ENV === 'production'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token';
}
