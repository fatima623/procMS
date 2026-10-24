import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { notificationService } from '@/application/notification/NotificationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const page = Number(req.nextUrl.searchParams.get('page') ?? '1') || 1;
    const onlyUnread = req.nextUrl.searchParams.get('unread') === '1';
    const data = await notificationService.listMine(ctx, { page, onlyUnread });
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
