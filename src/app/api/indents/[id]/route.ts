import { NextResponse, type NextRequest } from 'next/server';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const indent = await getContainer().getIndent.execute(ctx, params.id);
    return NextResponse.json(
      {
        data: {
          id: indent.id,
          indentNumber: indent.indentNumber,
          controlNumber: indent.controlNumber,
          subject: indent.subject,
          justification: indent.justification ?? null,
          type: indent.type,
          priority: indent.priority,
          status: indent.status,
          estimatedValue: indent.estimatedValue.toJSON(),
          indenterId: indent.indenterId,
          sectionId: indent.sectionId,
          assignedAdpId: indent.assignedAdpId,
          fiscalYearId: indent.fiscalYearId,
          budgetHeadId: indent.budgetHeadId,
          submittedAt: indent.submittedAt?.toISOString() ?? null,
          closedAt: indent.closedAt?.toISOString() ?? null,
          cancelledAt: indent.cancelledAt?.toISOString() ?? null,
          cancelledReason: indent.cancelledReason,
          createdAt: indent.createdAt.toISOString(),
          version: indent.version,
          items: indent.items.map((it) => ({
            id: it.id,
            lineNo: it.lineNo,
            itemCode: it.itemCode ?? null,
            description: it.description,
            specifications: it.specifications ?? null,
            quantity: it.quantity,
            uom: it.uom,
            estimatedUnitPrice: it.estimatedUnitPrice.toJSON(),
            estimatedLineTotal: it.estimatedLineTotal().toJSON(),
          })),
        },
      },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
