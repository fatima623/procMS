import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { updateFirmItemSchema } from '@/interfaces/http/schemas/firm';
import { firmChildService } from '@/infrastructure/firm/FirmChildService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; itemId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id, itemId } = await params;
    await requireAuth(req, [Role.ADMIN]);
    const body = updateFirmItemSchema.parse(await req.json());
    const data = await firmChildService.updateItem(id, itemId, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id, itemId } = await params;
    await requireAuth(req, [Role.ADMIN]);
    await firmChildService.deleteItem(id, itemId);
    return NextResponse.json({ data: { ok: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}