import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { AdminUserService } from '@/application/admin/AdminUserService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { resetPasswordSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new AdminUserService();

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = resetPasswordSchema.parse(await req.json());
    await service.resetPassword(ctx, params.id, body.password);
    return NextResponse.json({ data: { ok: true } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
