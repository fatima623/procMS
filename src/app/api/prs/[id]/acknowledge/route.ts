import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.FIRM_REP, Role.ADMIN]);
    await getContainer().acknowledgePR.execute(ctx, params.id);
    return NextResponse.json(
      { data: { ok: true } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
