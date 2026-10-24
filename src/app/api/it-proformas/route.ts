import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createITPerformaSchema } from '@/interfaces/http/schemas/itproforma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADP_STAFF, Role.ADMIN]);
    const body = createITPerformaSchema.parse(await req.json());
    const result = await getContainer().createITPerforma.execute(ctx, body);
    return NextResponse.json(
      { data: result },
      { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
