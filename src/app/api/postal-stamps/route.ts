import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createPostalStampSchema } from '@/interfaces/http/schemas/registry';
import { REGISTRY_ROLES, registryService } from '@/infrastructure/registry/RegistryService';
import { listPostalStamps } from '@/interfaces/ui/views/RegistryViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/postal-stamps — the postal stamp register. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, REGISTRY_ROLES);
    const data = await listPostalStamps();
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

/** POST /api/postal-stamps — { denomination, quantity, usedOn, correspondenceId? } */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, REGISTRY_ROLES);
    const body = createPostalStampSchema.parse(await req.json());
    const result = await registryService.createPostalStamp(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
