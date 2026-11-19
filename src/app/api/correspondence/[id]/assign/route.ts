import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { assignCorrespondenceSchema } from '@/interfaces/http/schemas/registry';
import { REGISTRY_ROLES, registryService } from '@/infrastructure/registry/RegistryService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/correspondence/[id]/assign — { assignedToUserId: string | null } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, REGISTRY_ROLES);
    const body = assignCorrespondenceSchema.parse(await req.json());
    await registryService.assign(id, body);
    return NextResponse.json({ data: { id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
