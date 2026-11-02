import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { commentService } from '@/application/comment/CommentService';
import { postCommentSchema } from '@/interfaces/http/schemas/comment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req);
    const body = postCommentSchema.parse(await req.json());
    const data = await commentService.post(ctx, { indentId: id, ...body });
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) { return toHttpResponse(err, rid); }
}
