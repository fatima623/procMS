import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createAnnualPlanSchema } from '@/interfaces/http/schemas/annualPlan';
import { planningService } from '@/infrastructure/planning/PlanningService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N, Role.COORD_STAFF]);
    const body = createAnnualPlanSchema.parse(await req.json());
    const result = await planningService.createDraft(body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
