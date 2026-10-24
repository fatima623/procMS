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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const q = req.nextUrl.searchParams.get('q') ?? undefined;
    const page = Number(req.nextUrl.searchParams.get('page') ?? '1') || 1;
    const data = await service.list(ctx, { search: q, page });
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const body = upsertFirmSchema.parse(await req.json());
    const data = await service.create(ctx, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
