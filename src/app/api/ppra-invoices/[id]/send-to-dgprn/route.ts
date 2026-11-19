import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { sendToDGPRNSchema } from '@/interfaces/http/schemas/ppraInvoice';
import { PPRA_INVOICE_ROLES, ppraInvoiceService } from '@/infrastructure/finance/PPRAInvoiceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/ppra-invoices/[id]/send-to-dgprn — { sentOn? } (RECEIVED → SENT_TO_DGPRN). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, PPRA_INVOICE_ROLES);
    const body = sendToDGPRNSchema.parse(await req.json().catch(() => ({})));
    await ppraInvoiceService.sendToDGPRN(id, body);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
