import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { AdminImportService } from '@/application/admin/AdminImportService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new AdminImportService();

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN]);
    const csv = await req.text();
    const result = await service.importFirms(ctx, csv);
    return NextResponse.json({ data: result }, { status: result.errors.length === 0 ? 200 : 207, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
