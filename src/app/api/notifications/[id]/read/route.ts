import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { notificationService } from '@/application/notification/NotificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    await notificationService.markRead(ctx, params.id);
    return NextResponse.json({ data: { ok: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
