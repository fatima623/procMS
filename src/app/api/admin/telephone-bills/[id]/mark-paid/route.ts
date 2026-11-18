import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { markPaidSchema } from '@/interfaces/http/schemas/telephoneBill';
import { telephoneBillService } from '@/infrastructure/admin/TelephoneBillService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const { id } = await params;
    const body = markPaidSchema.parse(await req.json());
    await telephoneBillService.markPaid(id, body);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
