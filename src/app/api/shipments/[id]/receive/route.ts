import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { markShipmentReceivedSchema } from '@/interfaces/http/schemas/executionEvidence';
import { executionEvidence } from '@/infrastructure/execution/ExecutionEvidenceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF, Role.INSPECTORATE]);
    const body = markShipmentReceivedSchema.parse(await req.json());
    await executionEvidence.markShipmentReceived(id, body);
    return NextResponse.json({ data: { id: id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
