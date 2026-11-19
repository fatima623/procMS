import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { sendMessageSchema } from '@/interfaces/http/schemas/mail';
import { mailBoxService } from '@/infrastructure/mail-box/MailBoxService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/messages — { toUserId, subject, body } (internal users only). */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = sendMessageSchema.parse(await req.json());
    const result = await mailBoxService.send(ctx, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
