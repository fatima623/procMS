import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { impersonationService, sessionCookieName } from '@/application/admin/ImpersonationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ userId: z.string().length(26) });

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const { userId } = schema.parse(await req.json());
    const result = await impersonationService.beginImpersonation(ctx, userId);

    const res = NextResponse.json(
      { data: { impersonating: userId, maxAgeSeconds: result.maxAgeSeconds } },
      { headers: { [REQUEST_ID_HEADER]: rid } },
    );
    res.cookies.set(sessionCookieName(), result.cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: result.maxAgeSeconds,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) { return toHttpResponse(err, rid); }
}
