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

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const { code } = schema.parse(await req.json());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { totpSecret: true, totpEnabledAt: true } as any });
    if (!user?.totpSecret) {
      return NextResponse.json({ error: { code: 'NO_PENDING_ENROLL', message: 'Start enrollment first.' } }, { status: 400 });
    }
    if (!verifyTotp(user.totpSecret, code)) {
      return NextResponse.json({ error: { code: 'INVALID_CODE', message: 'Incorrect code — check device clock & try again.' } }, { status: 400 });
    }
    const wasEnabled = user.totpEnabledAt !== null;
    await prisma.user.update({ where: { id: ctx.userId }, data: { totpEnabledAt: wasEnabled ? user.totpEnabledAt : new Date() } as any });
    await prisma.auditLog.create({
      data: {
        id: ulid(), actorUserId: ctx.userId,
        action: wasEnabled ? 'me.2fa.verified' : 'me.2fa.enabled',
        subjectType: 'USER', subjectId: ctx.userId,
      },
    });
    return NextResponse.json(
      { data: { enabled: true, firstTime: !wasEnabled } },
      { headers: { [REQUEST_ID_HEADER]: rid } },
    );
  } catch (err) { return toHttpResponse(err, rid); }
}
