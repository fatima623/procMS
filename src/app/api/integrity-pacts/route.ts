import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createIntegrityPactSchema } from '@/interfaces/http/schemas/compliance';
import { compliancePolicy } from '@/infrastructure/compliance/CompliancePolicyService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = createIntegrityPactSchema.parse(await req.json());
    const result = await compliancePolicy.createIntegrityPact(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
