import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { decideGrievanceSchema } from '@/interfaces/http/schemas/compliance';
import { compliancePolicy } from '@/infrastructure/compliance/CompliancePolicyService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    // GRC = odd-number committee; here admins and senior staff may record the decision.
    await requireAuth(req, [Role.ADMIN, Role.DGDP, Role.SECY_DP, Role.DP_N]);
    const body = decideGrievanceSchema.parse(await req.json());
    await compliancePolicy.decideGrievance(id, body);
    return NextResponse.json({ data: { id: id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
