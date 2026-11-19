import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { replyObjectionSchema } from '@/interfaces/http/schemas/audit';
import { AUDIT_ROLES, auditService } from '@/infrastructure/audit/AuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/audit-records/[id]/objections/[objectionId]/reply — { replyText, repliedOn? } (OPEN → REPLIED). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; objectionId: string }> },
): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id, objectionId } = await params;
    const ctx = await requireAuth(req, AUDIT_ROLES);
    const body = replyObjectionSchema.parse(await req.json());
    await auditService.replyObjection(ctx.userId, id, objectionId, body);
    return NextResponse.json({ data: { id: objectionId } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
