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
const schema = z.object({
  id: z.string().length(26),
  token: z.string().length(64),
  password: z.string().min(10).max(200),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const limited = await enforceRateLimit({ key: `reset:${clientIp(req)}`, limit: 5, windowSeconds: 60 });
    if (limited) return limited;
    const body = schema.parse(await req.json());
    const userId = await service.completeReset(body.id, body.token, body.password);
    return NextResponse.json({ data: { userId } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
