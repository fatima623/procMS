import { NextResponse, type NextRequest } from 'next/server';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { answerQuerySchema } from '@/interfaces/http/schemas/tsr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = answerQuerySchema.parse(await req.json());
    await getContainer().answerQuery.execute(ctx, params.id, body);
    return NextResponse.json(
      { data: { ok: true } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
