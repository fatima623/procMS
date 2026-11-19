import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { decisionApprovalSchema } from '@/interfaces/http/schemas/decisionApproval';
import { DECISION_ROLES, lockDecision, unlockDecision } from '@/infrastructure/communication/DecisionApprovalService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/indents/[id]/decision-approval — { action: APPROVE | UN_APPROVE, remarks? } (remarks required for UN_APPROVE). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, DECISION_ROLES);
    const body = decisionApprovalSchema.parse(await req.json());
    if (body.action === 'APPROVE') await lockDecision(ctx.userId, 'INDENT', id, body.remarks);
    else await unlockDecision(ctx.userId, 'INDENT', id, body.remarks);
    return NextResponse.json({ data: { id, action: body.action } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
