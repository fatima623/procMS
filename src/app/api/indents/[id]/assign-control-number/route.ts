import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { Role } from '@prisma/client';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ controlNumber: z.string().min(1).max(40) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, [Role.ADP_STAFF, Role.ADMIN]);
    const body = schema.parse(await req.json());
    await getContainer().assignControlNumber.execute(ctx, id, body);
    return NextResponse.json(
      { data: { ok: true } },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
