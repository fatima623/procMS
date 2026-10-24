import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { AdminUserService } from '@/application/admin/AdminUserService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createUserSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new AdminUserService();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const page = Number(req.nextUrl.searchParams.get('page') ?? '1') || 1;
    const search = req.nextUrl.searchParams.get('q') ?? undefined;
    const result = await service.list(ctx, { page, search });
    return NextResponse.json({ data: result }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = createUserSchema.parse(await req.json());
    const user = await service.create(ctx, body);
    return NextResponse.json({ data: user }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
