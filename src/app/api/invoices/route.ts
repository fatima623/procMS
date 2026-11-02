import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';

import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createInvoiceSchema } from '@/interfaces/http/schemas/execution';
import { executionAdmin } from '@/infrastructure/execution/ExecutionAdminService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.COORD_STAFF, Role.ADP_STAFF]);
    const body = createInvoiceSchema.parse(await req.json());
    const result = await executionAdmin.createInvoice(body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
