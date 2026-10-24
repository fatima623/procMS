/**
 * NextAuth v5 wiring. Credentials provider against our User table.
 *
 * Session augmentation: we extend the Session user with the roles, section
 * memberships, and (for FIRM_REP) firmId so authz can run without an extra
 * DB round trip per request.
 *
 * Token-side augmentation is skipped — in v5 beta the `next-auth/jwt`
 * module path isn't always reliable; we round-trip the extra fields through
 * `token as any`, which is safe because the JWT body lives entirely in-process.
 */
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from '@/infrastructure/db/prisma';
import type { Role } from '@prisma/client';
import { verifyTotp } from '@/infrastructure/auth/totp';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: Role[];
      sectionIds: string[];
      firmId?: string;
    } & DefaultSession['user'];
    impersonatedBy?: string;
    impersonatedByEmail?: string;
  }
}

interface AugmentedToken {
  userId?: string;
  roles?: Role[];
  sectionIds?: string[];
  firmId?: string;
  impersonatedBy?: string;
  impersonatedByEmail?: string;
}

// Optional OIDC provider — appears on the sign-in page only when all four
// env vars are set. Falls back to Credentials-only when the enterprise
// identity provider isn't configured.
function oidcProvider() {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  if (!issuer || !clientId || !clientSecret) return null;
  return {
    id: 'oidc',
    name: process.env.OIDC_PROVIDER_NAME ?? 'Corporate SSO',
    type: 'oidc' as const,
    issuer,
    clientId,
    clientSecret,
    authorization: { params: { scope: 'openid email profile' } },
    allowDangerousEmailAccountLinking: false,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 14 * 24 * 60 * 60, updateAge: 2 * 60 * 60 },
  providers: ([
    oidcProvider(),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        totp: { label: '2FA code (6 digits)', type: 'text' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user: any = await prisma.user.findUnique({
          where: { email: String(creds.email).toLowerCase() },
          include: { roles: true, memberships: true },
        });
        if (!user || !user.isActive) return null;

        const ok = await bcrypt.compare(String(creds.password), user.passwordHash);
        if (!ok) return null;

        // Second factor — only enforced for users who've enrolled.
        if (user.totpEnabledAt && user.totpSecret) {
          const code = creds.totp ? String(creds.totp).trim() : '';
          if (!/^\d{6}$/.test(code)) return null;
          if (!verifyTotp(user.totpSecret, code)) return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          roles: (user.roles as Array<{ role: Role }>).map((r) => r.role),
          sectionIds: (user.memberships as Array<{ sectionId: string }>).map((m) => m.sectionId),
          firmId: user.firmId ?? undefined,
        } as unknown as import('next-auth').User;
      },
    }),
  ].filter(Boolean) as unknown as import('next-auth').NextAuthConfig['providers']),
  callbacks: {
    jwt({ token, user }) {
      const t = token as unknown as AugmentedToken & Record<string, unknown>;
      if (user) {
        const u = user as unknown as { id: string; roles: Role[]; sectionIds: string[]; firmId?: string };
        t.userId = u.id;
        t.roles = u.roles;
        t.sectionIds = u.sectionIds;
        if (u.firmId) t.firmId = u.firmId;
      }
      return t as unknown as typeof token;
    },
    session({ session, token }) {
      const t = token as unknown as AugmentedToken;
      session.user.id = t.userId ?? '';
      session.user.roles = t.roles ?? [];
      session.user.sectionIds = t.sectionIds ?? [];
      if (t.firmId) session.user.firmId = t.firmId;
      if (t.impersonatedBy) {
        (session as unknown as { impersonatedBy?: string }).impersonatedBy = t.impersonatedBy;
      }
      if (t.impersonatedByEmail) {
        (session as unknown as { impersonatedByEmail?: string }).impersonatedByEmail = t.impersonatedByEmail;
      }
      return session;
    },
  },
});
