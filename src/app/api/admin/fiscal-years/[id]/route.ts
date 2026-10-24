import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { AdminFiscalYearService } from '@/application/admin/AdminFiscalYearService';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { upsertFiscalYearSchema } from '@/interfaces/http/schemas/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const service = new AdminFiscalYearService();

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
    const body = upsertFiscalYearSchema.partial().parse(await req.json());
    const data = await service.update(ctx, params.id, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
