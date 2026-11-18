import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { decideVehicleRequisitionSchema } from '@/interfaces/http/schemas/transport';
import { vehicleRequisitionService } from '@/infrastructure/transport/VehicleRequisitionService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req);
    const body = decideVehicleRequisitionSchema.parse(await req.json());
    await vehicleRequisitionService.decide(id, ctx.userId, body);
    return NextResponse.json({ data: { success: true } }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
