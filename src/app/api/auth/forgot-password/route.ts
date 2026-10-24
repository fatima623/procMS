import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { PasswordResetService } from '@/application/auth/PasswordResetService';
import { defaultMailer } from '@/infrastructure/mail';
import { enforceRateLimit, clientIp } from '@/interfaces/http/rateLimit';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new PasswordResetService(defaultMailer);
const schema = z.object({ email: z.string().email() });

/**
 * Fire-and-forget. Always 200 — no user enumeration.
 * Rate-limited per IP (3/min) so an attacker can't harvest emails by timing.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const limited = await enforceRateLimit({ key: `forgot:${clientIp(req)}`, limit: 3, windowSeconds: 60 });
    if (limited) return limited;
    const { email } = schema.parse(await req.json());
    const baseUrl = process.env.NEXTAUTH_URL ?? `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    await service.requestReset(email, baseUrl);
    return NextResponse.json({ data: { ok: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
