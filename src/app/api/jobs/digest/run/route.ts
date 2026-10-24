import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { WeeklyDigestUseCase } from '@/application/digest/WeeklyDigestUseCase';
import { defaultMailer } from '@/infrastructure/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin-triggered or cron-triggered weekly digest run. Recipients come from
 * every ADMIN + SECY_DP + DGDP + DP_N user, plus any additional emails on
 * the DIGEST_RECIPIENTS env var (comma-separated).
 *
 * External cron:
 *   curl -X POST -H "X-CSRF-Token: $(curl -s -c - /api/health | grep csrf_token | awk '{print $7}')" \
 *     https://.../api/jobs/digest/run
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN]);
    const extra = (process.env.DIGEST_RECIPIENTS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const leadership = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: { some: { role: { in: [Role.ADMIN, Role.SECY_DP, Role.DGDP, Role.DP_N] } } },
      },
      select: { email: true, displayName: true },
    });
    const recipients = [
      ...leadership.map((u) => ({ email: u.email, name: u.displayName })),
      ...extra.map((email) => ({ email })),
    ];
    const seen = new Set<string>();
    const unique = recipients.filter((r) => (seen.has(r.email) ? false : (seen.add(r.email), true)));

    const useCase = new WeeklyDigestUseCase(defaultMailer);
    const result = await useCase.execute({ recipients: unique });
    return NextResponse.json({ data: result }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
