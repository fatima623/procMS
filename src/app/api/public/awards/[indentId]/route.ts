import { NextResponse, type NextRequest } from 'next/server';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { publicAward } from '@/infrastructure/transparency/TransparencyService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * PPRA Rule 47 — public access to award documents. Returns the evaluation
 * summary + contract for a given indent, provided a Contract exists.
 *
 * This endpoint is intentionally UNAUTHENTICATED (no `requireAuth`). It
 * returns only award-relevant fields; nothing that could identify a
 * user beyond their displayName. Returns 404 when no Contract exists
 * (either the award has not happened, or the indent is a fiction).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ indentId: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { indentId } = await params;
    const data = await publicAward.getAwardSummary(indentId);
    if (!data) {
      return NextResponse.json({ error: { message: 'No award on record for that indent' } }, { status: 404, headers: { [REQUEST_ID_HEADER]: requestId } });
    }
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: requestId, 'cache-control': 'public, max-age=300' } });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
