import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { AUDIT_ROLES, auditService } from '@/infrastructure/audit/AuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/audit-records/[id]/objections/[objectionId]/settle — REPLIED → SETTLED. */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectionId: string }> },
): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id, objectionId } = await params;
    await requireAuth(req, AUDIT_ROLES);
    await auditService.settleObjection(id, objectionId);
    return NextResponse.json({ data: { id: objectionId } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
