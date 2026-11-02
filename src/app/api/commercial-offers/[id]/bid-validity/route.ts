import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/infrastructure/db/prisma';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { NotFoundError } from '@/domain/errors/DomainError';
import { setBidValiditySchema } from '@/interfaces/http/schemas/bidValidity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PPRA Rule 26 — set or extend the validity date of a commercial offer.
 * Lives as an admin-only auxiliary endpoint; the CommercialOffer domain
 * aggregate does not need to know about it (no state transition).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req, [Role.ADMIN, Role.ADP_STAFF, Role.COORD_STAFF]);
    const body = setBidValiditySchema.parse(await req.json());
    const row = await prisma.commercialOffer.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!row) throw new NotFoundError('CommercialOffer', params.id);
    await prisma.commercialOffer.update({ where: { id: params.id }, data: { bidValidUntil: body.bidValidUntil } });
    return NextResponse.json({ data: { id: params.id } }, { headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
