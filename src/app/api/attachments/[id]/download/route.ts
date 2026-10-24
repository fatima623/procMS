import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { LocalFsAttachmentStorage } from '@/infrastructure/storage/LocalFsAttachmentStorage';
import { prisma } from '@/infrastructure/db/prisma';
import { NotFoundError } from '@/domain/errors/DomainError';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const storage = LocalFsAttachmentStorage.default();

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<NextResponse | Response> {
  const requestId = requestIdOf(req);
  try {
    await requireAuth(req);
    const row = await prisma.attachment.findUnique({ where: { id: params.id } });
    if (!row) throw new NotFoundError('Attachment', params.id);

    const bytes = await storage.get(row.storageKey);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': row.mimeType,
        'Content-Length': String(row.sizeBytes),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(row.originalName)}"`,
        [REQUEST_ID_HEADER]: requestId,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
