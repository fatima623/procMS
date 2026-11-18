import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createTelephoneBillSchema } from '@/interfaces/http/schemas/telephoneBill';
import { telephoneBillService } from '@/infrastructure/admin/TelephoneBillService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const rawPaid = url.searchParams.get('paid');
    const paid =
      rawPaid === 'true' ? true : rawPaid === 'false' ? false : undefined;
    const data = await telephoneBillService.list(paid !== undefined ? { paid } : undefined);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = createTelephoneBillSchema.parse(await req.json());
    const data = await telephoneBillService.create(ctx.userId, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
