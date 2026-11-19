import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { addItemSchema } from '@/interfaces/http/schemas/audit';
import { AUDIT_ROLES, auditService } from '@/infrastructure/audit/AuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/audit-records/[id]/items — { itemText } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, AUDIT_ROLES);
    const body = addItemSchema.parse(await req.json());
    const result = await auditService.addItem(id, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
