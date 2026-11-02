import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { issueTakingOverSchema } from '@/interfaces/http/schemas/takingOver';
import { executionObligations } from '@/infrastructure/execution/ExecutionObligationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * DPP&I-35 Ch XVI — issue the Taking-Over Certificate for a contract.
 * Refused by the service when any open discrepancy remains.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.INSPECTORATE]);
    const body = issueTakingOverSchema.parse(await req.json());
    await executionObligations.issueTakingOverCertificate(params.id, body.certifiedOn);
    return NextResponse.json({ data: { id: params.id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
