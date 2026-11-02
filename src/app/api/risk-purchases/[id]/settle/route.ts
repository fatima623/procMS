import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { settleRiskPurchaseSchema } from '@/interfaces/http/schemas/frameworks';
import { riskPurchaseService } from '@/infrastructure/frameworks/FrameworkService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.DP_N, Role.DGDP, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = settleRiskPurchaseSchema.parse(await req.json());
    await riskPurchaseService.settle(params.id, body);
    return NextResponse.json({ data: { id: params.id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
