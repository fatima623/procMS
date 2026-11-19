import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { addMinuteSchema } from '@/interfaces/http/schemas/registry';
import { registryService } from '@/infrastructure/registry/RegistryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/correspondence/[id]/minutes — { kind: IMF|EMF, text } (registry staff or assigned officer). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req);
    const body = addMinuteSchema.parse(await req.json());
    const result = await registryService.addMinute(ctx, id, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
