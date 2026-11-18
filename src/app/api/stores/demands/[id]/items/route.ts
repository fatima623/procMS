import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { demandItemSchema } from '@/interfaces/http/schemas/internalDemand';
import { internalDemandService } from '@/infrastructure/stores/InternalDemandService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req);
    const body = demandItemSchema.parse(await req.json());
    const data = await internalDemandService.addItem(id, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
