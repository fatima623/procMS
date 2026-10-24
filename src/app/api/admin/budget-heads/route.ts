import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { AdminBudgetHeadService } from '@/application/admin/AdminBudgetHeadService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { upsertBudgetHeadSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = new AdminBudgetHeadService();

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const data = await service.list(ctx);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = upsertBudgetHeadSchema.parse(await req.json());
    const data = await service.create(ctx, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
