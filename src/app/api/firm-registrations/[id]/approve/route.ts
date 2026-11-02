import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { approveFirmRegistrationSchema } from '@/interfaces/http/schemas/firmRegistration';
import { firmRegistrationService } from '@/infrastructure/registration/FirmRegistrationService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, [Role.ADMIN, Role.COORD_STAFF, Role.ADP_STAFF]);
    const body = approveFirmRegistrationSchema.parse(await req.json());
    await firmRegistrationService.approve(params.id, ctx.userId, body);
    return NextResponse.json({ data: { id: params.id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
