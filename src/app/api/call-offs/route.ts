import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createCallOffSchema } from '@/interfaces/http/schemas/frameworks';
import { frameworkService } from '@/infrastructure/frameworks/FrameworkService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.COORD_STAFF, Role.ADP_STAFF]);
    const body = createCallOffSchema.parse(await req.json());
    const result = await frameworkService.placeCallOff(body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
