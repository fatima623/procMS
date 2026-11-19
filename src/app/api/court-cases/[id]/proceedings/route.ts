import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { addProceedingSchema } from '@/interfaces/http/schemas/legal';
import { LEGAL_ROLES, courtCaseService } from '@/infrastructure/legal/CourtCaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/court-cases/[id]/proceedings — { hearingDate, outcome, nextHearingDate?, notes?, documentKey? } (PENDING cases only). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, LEGAL_ROLES);
    const body = addProceedingSchema.parse(await req.json());
    const result = await courtCaseService.addProceeding(ctx.userId, id, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
