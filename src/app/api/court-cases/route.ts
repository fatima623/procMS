import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createCourtCaseSchema } from '@/interfaces/http/schemas/legal';
import { LEGAL_ROLES, courtCaseService } from '@/infrastructure/legal/CourtCaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/court-cases — { caseNumber, court, party, counterParty, filedOn, relatedIndentId?, relatedContractId?, documentKey? } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, LEGAL_ROLES);
    const body = createCourtCaseSchema.parse(await req.json());
    const result = await courtCaseService.createCase(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
