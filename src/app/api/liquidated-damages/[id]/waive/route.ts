import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { waiveLDSchema } from '@/interfaces/http/schemas/executionObligations';
import { executionObligations } from '@/infrastructure/execution/ExecutionObligationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DPP&I-35 Ch XIII — post-assessment waiver on an LD row. Caller must be
 * the competent authority (ADMIN / ADP_STAFF / COORD_STAFF).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = waiveLDSchema.parse(await req.json());
    await executionObligations.waiveLD(id, body);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
