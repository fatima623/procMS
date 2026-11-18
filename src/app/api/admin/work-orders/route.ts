import { NextResponse, type NextRequest } from 'next/server';
import { WorkOrderStatus } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createWorkOrderSchema } from '@/interfaces/http/schemas/workOrder';
import { workOrderService } from '@/infrastructure/workorders/WorkOrderService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const rawStatus = url.searchParams.get('status');
    const status = rawStatus && Object.values(WorkOrderStatus).includes(rawStatus as WorkOrderStatus)
      ? (rawStatus as WorkOrderStatus)
      : undefined;

    const data = await workOrderService.list(status ? { status } : undefined);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = createWorkOrderSchema.parse(await req.json());
    const data = await workOrderService.create(ctx.userId, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
