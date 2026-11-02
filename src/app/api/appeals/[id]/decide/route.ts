import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { decideAppealSchema } from '@/interfaces/http/schemas/specialCases';
import { appealService } from '@/infrastructure/specialCases/SpecialCaseServices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.DGDP, Role.SECY_DP]);
    const body = decideAppealSchema.parse(await req.json());
    await appealService.decide(params.id, body);
    return NextResponse.json({ data: { id: params.id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
