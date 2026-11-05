import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { closeContractSchema } from '@/interfaces/http/schemas/takingOver';
import { executionObligations } from '@/infrastructure/execution/ExecutionObligationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DPP&I-35 Ch XII — formally close a contract after Taking-Over and all
 * follow-up obligations are discharged. COMPLETED → CLOSED, stamps closedOn.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = closeContractSchema.parse(await req.json());
    await executionObligations.closeContract(id, body.closedOn);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
