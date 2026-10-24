import { NextResponse, type NextRequest } from 'next/server';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { raiseQuerySchema } from '@/interfaces/http/schemas/tsr';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = raiseQuerySchema.parse(await req.json());
    const result = await getContainer().raiseQuery.execute(ctx, params.id, body);
    return NextResponse.json(
      { data: result },
      { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
