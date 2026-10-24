import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/infrastructure/db/prisma';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { generateBase32Secret, totpUri } from '@/infrastructure/auth/totp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Begin enrollment: generate a fresh secret and store it on the user.
 * The secret is NOT yet active — the user has to prove possession by
 * returning a valid 6-digit code to `/api/me/2fa/verify` before we flip
 * `totpEnabledAt`.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true, totpEnabledAt: true } as any });
    if (!user) throw new Error('User missing');
    if (user.totpEnabledAt) {
      return NextResponse.json(
        { error: { code: 'ALREADY_ENABLED', message: 'TOTP is already enabled. Disable it first to re-enroll.' } },
        { status: 409, headers: { [REQUEST_ID_HEADER]: rid } },
      );
    }
    const secret = generateBase32Secret();
    await prisma.user.update({ where: { id: ctx.userId }, data: { totpSecret: secret } as any });
    const uri = totpUri({ secretBase32: secret, label: user.email, issuer: 'DP-Navy Procurement' });
    return NextResponse.json(
      { data: { secret, uri } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: rid } },
    );
  } catch (err) { return toHttpResponse(err, rid); }
}
