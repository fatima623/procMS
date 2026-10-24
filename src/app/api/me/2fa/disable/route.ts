import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/infrastructure/db/prisma';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { verifyTotp } from '@/infrastructure/auth/totp';
import { ulid } from 'ulid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ code: z.string().regex(/^\d{6}$/) });

/**
 * Disable TOTP. We require a fresh code so a stolen session can't disable
 * 2FA without physical possession of the authenticator.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const { code } = schema.parse(await req.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { totpSecret: true, totpEnabledAt: true } as any });
    if (!user?.totpSecret || !user.totpEnabledAt) {
      return NextResponse.json({ error: { code: 'NOT_ENABLED', message: 'TOTP is not enabled.' } }, { status: 400 });
    }
    if (!verifyTotp(user.totpSecret, code)) {
      return NextResponse.json({ error: { code: 'INVALID_CODE', message: 'Incorrect code.' } }, { status: 400 });
    }
    await prisma.user.update({ where: { id: ctx.userId }, data: { totpSecret: null, totpEnabledAt: null } as any });
    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: ctx.userId,
        action: 'me.2fa.disabled',
        subjectType: 'USER', subjectId: ctx.userId,
      },
    });
    return NextResponse.json({ data: { disabled: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
