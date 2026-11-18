import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { updateDemandSchema } from '@/interfaces/http/schemas/internalDemand';
import { internalDemandService } from '@/infrastructure/stores/InternalDemandService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req);
    const data = await internalDemandService.get(id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req);
    const body = updateDemandSchema.parse(await req.json());
    await internalDemandService.update(id, body);
    return NextResponse.json({ data: { success: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
