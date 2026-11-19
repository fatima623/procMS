import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { budgetCardService } from '@/infrastructure/budget/BudgetCardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, [Role.BUDGET_STAFF, Role.ADMIN]);
    const data = await budgetCardService.clear(ctx, id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}