import { NextResponse, type NextRequest } from 'next/server';
import { buildOpenApiDocument } from '@/interfaces/http/openapi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Unauthenticated — the API is self-documenting. The content inside
 * follows the real auth model (see `security` section in the doc).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const doc = buildOpenApiDocument(baseUrl);
  return NextResponse.json(doc, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
    },
  });
}
