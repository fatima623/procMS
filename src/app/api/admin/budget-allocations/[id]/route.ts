import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { AdminBudgetAllocationService } from '@/application/admin/AdminBudgetAllocationService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { upsertBudgetAllocationSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = new AdminBudgetAllocationService();

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const data = await service.get(ctx, params.id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = upsertBudgetAllocationSchema.partial().parse(await req.json());
    const data = await service.update(ctx, params.id, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
