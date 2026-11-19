import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createPPRAInvoiceSchema } from '@/interfaces/http/schemas/ppraInvoice';
import { PPRA_INVOICE_ROLES, ppraInvoiceService } from '@/infrastructure/finance/PPRAInvoiceService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/ppra-invoices — { invoiceNumber, receivedOn, amount, currency?, itPerformaIds[], documentKey? } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, PPRA_INVOICE_ROLES);
    const body = createPPRAInvoiceSchema.parse(await req.json());
    const result = await ppraInvoiceService.createInvoice(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
