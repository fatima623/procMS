import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { ForbiddenError, NotFoundError } from '@/domain/errors/DomainError';
import { isRegistryUser } from '@/infrastructure/registry/RegistryService';
import { loadCorrespondence } from '@/interfaces/ui/views/RegistryViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/correspondence/[id] — registry staff, admins, or the assigned officer. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req);
    const row = await loadCorrespondence(id);
    if (!row) throw new NotFoundError('OfficialCorrespondence', id);
    if (!isRegistryUser(ctx) && row.assignedToUserId !== ctx.userId) {
      throw new ForbiddenError('Not allowed to view this correspondence');
    }
    return NextResponse.json({ data: row }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
