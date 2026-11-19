import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { changeCourtCaseStatusSchema } from '@/interfaces/http/schemas/legal';
import { LEGAL_ROLES, courtCaseService } from '@/infrastructure/legal/CourtCaseService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/court-cases/[id]/status — { status: CLOSED | DISPOSED_OFF } (from PENDING only; final). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, LEGAL_ROLES);
    const body = changeCourtCaseStatusSchema.parse(await req.json());
    await courtCaseService.changeStatus(id, body);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
