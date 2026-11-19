import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createAuditRecordSchema } from '@/interfaces/http/schemas/audit';
import { AUDIT_ROLES, auditService } from '@/infrastructure/audit/AuditService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/audit-records — { auditSection, fiscalYearId, raisedOn, subjectIndentId?, subjectContractId?, documentKey? } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, AUDIT_ROLES);
    const body = createAuditRecordSchema.parse(await req.json());
    const result = await auditService.createRecord(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
