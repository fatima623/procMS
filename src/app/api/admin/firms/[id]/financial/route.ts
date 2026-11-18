import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { firmFinancialSchema } from '@/interfaces/http/schemas/firm';
import { firmChildService } from '@/infrastructure/firm/FirmChildService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN]);
    const data = await firmChildService.getFinancial(id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

// One financial record per firm: PUT creates it or replaces it.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN]);
    const body = firmFinancialSchema.parse(await req.json());
    const data = await firmChildService.saveFinancial(id, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}