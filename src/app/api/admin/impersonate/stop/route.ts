import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { impersonationService, sessionCookieName } from '@/application/admin/ImpersonationService';
import { ForbiddenError } from '@/domain/errors/DomainError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Restore the original admin session. The impersonation token carries
 * `impersonatedBy`; without it, there's nothing to restore to and we 403.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const session = await auth();
    if (!session?.user) throw new ForbiddenError('Not authenticated');
    // The augmented session carries these at runtime even though the type is light.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const impersonatedBy: string | undefined = (session as any).impersonatedBy;
    const currentId = session.user.id;
    if (!impersonatedBy) throw new ForbiddenError('Not currently impersonating');

    const result = await impersonationService.stopImpersonation(impersonatedBy, currentId);

    const res = NextResponse.json(
      { data: { restoredTo: impersonatedBy } },
      { headers: { [REQUEST_ID_HEADER]: rid } },
    );
    res.cookies.set(sessionCookieName(), result.cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: result.maxAgeSeconds,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (err) { return toHttpResponse(err, rid); }
}
