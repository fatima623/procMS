import { NextResponse, type NextRequest } from 'next/server';
import { VehicleRequisitionStatus } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createVehicleRequisitionSchema } from '@/interfaces/http/schemas/transport';
import { vehicleRequisitionService } from '@/infrastructure/transport/VehicleRequisitionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const rawStatus = url.searchParams.get('status');
    const status = rawStatus && Object.values(VehicleRequisitionStatus).includes(rawStatus as VehicleRequisitionStatus)
      ? (rawStatus as VehicleRequisitionStatus)
      : undefined;

    const data = await vehicleRequisitionService.list(status ? { status } : undefined);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = createVehicleRequisitionSchema.parse(await req.json());
    const data = await vehicleRequisitionService.create(ctx.userId, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
