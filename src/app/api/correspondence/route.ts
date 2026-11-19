import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createCorrespondenceSchema } from '@/interfaces/http/schemas/registry';
import { REGISTRY_ROLES, registryService } from '@/infrastructure/registry/RegistryService';
import { listCorrespondence } from '@/interfaces/ui/views/RegistryViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/correspondence?direction=INWARD|OUTWARD&q=text — Central Registry list. */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, REGISTRY_ROLES);
    const sp = req.nextUrl.searchParams;
    const rows = await listCorrespondence({ direction: sp.get('direction') ?? undefined, q: sp.get('q') ?? undefined });
    return NextResponse.json({ data: rows }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

/** POST /api/correspondence — file a new inward/outward letter. */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req, REGISTRY_ROLES);
    const body = createCorrespondenceSchema.parse(await req.json());
    const result = await registryService.createCorrespondence(ctx.userId, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
