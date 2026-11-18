import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { updateFirmSignatorySchema } from '@/interfaces/http/schemas/firm';
import { firmChildService } from '@/infrastructure/firm/FirmChildService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string; signatoryId: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id, signatoryId } = await params;
    await requireAuth(req, [Role.ADMIN]);
    const body = updateFirmSignatorySchema.parse(await req.json());
    const data = await firmChildService.updateSignatory(id, signatoryId, body);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

// "Delete" deactivates the signatory; the row stays so contracts can still point at it.
export async function DELETE(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id, signatoryId } = await params;
    await requireAuth(req, [Role.ADMIN]);
    await firmChildService.deactivateSignatory(id, signatoryId);
    return NextResponse.json({ data: { ok: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}