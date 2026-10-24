import { NextResponse, type NextRequest } from 'next/server';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { decideApprovalSchema } from '@/interfaces/http/schemas/approval';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/approvals/:id/decide
 *
 * Body: { decision: "APPROVED" | "REJECTED" | "RETURNED", comments?: string }
 *
 * The current step's required role is checked inside the use-case against the
 * authenticated principal.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = decideApprovalSchema.parse(await req.json());
    await getContainer().actOnApproval.execute(ctx, params.id, body);
    return NextResponse.json(
      { data: { ok: true } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
