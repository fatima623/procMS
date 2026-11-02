import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { AdminFirmService } from '@/application/admin/AdminFirmService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { upsertFirmSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = new AdminFirmService();

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const data = await service.get(ctx, id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
        const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = upsertFirmSchema.partial().parse(await req.json());
    const data = await service.update(ctx, id, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
