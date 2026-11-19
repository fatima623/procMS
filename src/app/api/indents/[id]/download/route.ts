import { NextResponse, type NextRequest } from 'next/server';

import { NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import { buildDocument, docxResponseHeaders } from '@/infrastructure/docgen/DocxBuilder';
import { indentTemplate } from '@/infrastructure/docgen/templates';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { loadIndentDetail } from '@/interfaces/ui/views/IndentViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/indents/[id]/download?format=docx
 *
 * Reference implementation of the shared download pattern (Z1). Copy this
 * file for other entities: load the view, pick the template, buildDocument.
 * PDF is served by the HTML print view (/indents/[id]/print → Save as PDF).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { id } = await params;
    const ctx = await requireAuth(req);

    const format = req.nextUrl.searchParams.get('format') ?? 'docx';
    if (format !== 'docx') {
      throw new ValidationError(`Unsupported format "${format}". Use format=docx, or /indents/${id}/print for PDF.`, {
        format: 'unsupported',
      });
    }

    const indent = await loadIndentDetail(id);
    if (!indent) throw new NotFoundError('Indent', id);

    const buffer = await buildDocument(indentTemplate, indent, { generatedBy: ctx.userId });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { ...docxResponseHeaders(indentTemplate.fileName(indent)), [REQUEST_ID_HEADER]: requestId },
    });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
