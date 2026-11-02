import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { AdminUserService } from '@/application/admin/AdminUserService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { updateUserSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new AdminUserService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const user = await service.get(ctx, id);
    return NextResponse.json({ data: user }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
        const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = updateUserSchema.parse(await req.json());
    const user = await service.update(ctx, id, body);
    return NextResponse.json({ data: user }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
