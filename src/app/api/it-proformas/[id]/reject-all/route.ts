import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { rejectAllOffersSchema } from '@/interfaces/http/schemas/rebidding';
import { rebiddingService } from '@/infrastructure/itproforma/RebiddingService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = rejectAllOffersSchema.parse(await req.json());
    const result = await rebiddingService.rejectAllOffersAndReopen(id, body.reason);
    return NextResponse.json({ data: result }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
