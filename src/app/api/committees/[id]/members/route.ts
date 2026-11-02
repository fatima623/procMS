import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { addCommitteeMemberSchema } from '@/interfaces/http/schemas/governance';
import { committeeService } from '@/infrastructure/governance/CommitteeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req, [Role.ADMIN, Role.DGDP, Role.SECY_DP]);
    const body = addCommitteeMemberSchema.parse(await req.json());
    const result = await committeeService.addMember(id, body);
    return NextResponse.json({ data: result }, { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
