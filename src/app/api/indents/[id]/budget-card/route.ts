import { NextResponse, type NextRequest } from 'next/server';
import { Role } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { budgetCardService } from '@/infrastructure/budget/BudgetCardService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    await requireAuth(req);
    const data = await budgetCardService.getByIndent(id);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}

// POST = "Prepare Budget Card"
export async function POST(req: NextRequest, { params }: Ctx): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req, [Role.BUDGET_STAFF, Role.ADMIN]);
    const body = (await req.json().catch(() => ({}))) as { notes?: string };
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, 5000) : undefined;
    const data = await budgetCardService.prepare(ctx, id, notes);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}