import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createDGPRNAckSchema } from '@/interfaces/http/schemas/dgprnAck';
import { PPRA_INVOICE_ROLES } from '@/infrastructure/finance/PPRAInvoiceService';
import { dgprnAckService } from '@/infrastructure/finance/DGPRNAckService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/dgprn-acknowledgements — { invoiceId?, itPerformaId?, receivedOn, referenceNumber, remarks? } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, PPRA_INVOICE_ROLES);
    const body = createDGPRNAckSchema.parse(await req.json());
    const result = await dgprnAckService.createAcknowledgement(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
