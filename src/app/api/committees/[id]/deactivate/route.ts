import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { committeeService } from '@/infrastructure/governance/CommitteeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Deactivate a committee. The service refuses if it's already inactive;
 * member rows are preserved so the audit trail stays intact.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.DGDP, Role.SECY_DP]);
    await committeeService.deactivate(id);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
