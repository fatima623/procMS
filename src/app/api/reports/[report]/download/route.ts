import { NextResponse, type NextRequest } from 'next/server';
import { ForbiddenError, NotFoundError, ValidationError } from '@/domain/errors/DomainError';
import { buildDocument, docxResponseHeaders } from '@/infrastructure/docgen/DocxBuilder';
import { reportTemplate } from '@/infrastructure/docgen/templates';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { buildReportDoc, isReportSlug, parseReportFilters } from '@/interfaces/ui/views/ReportViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/reports/[report]/download?format=docx&fiscalYearId=&sectionId=&firmId= — internal users only. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ report: string }> }): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const { report } = await params;
    const ctx = await requireAuth(req);
    if (ctx.firmId) throw new ForbiddenError('Reports are for internal users only');
    if (!isReportSlug(report)) throw new NotFoundError('Report', report);

    const sp = req.nextUrl.searchParams;
    const format = sp.get('format') ?? 'docx';
    if (format !== 'docx') throw new ValidationError(`Unsupported format "${format}". Use format=docx.`, { format: 'unsupported' });

    const data = await buildReportDoc(report, parseReportFilters((k) => sp.get(k)));
    const buffer = await buildDocument(reportTemplate, data, { generatedBy: ctx.userId });
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { ...docxResponseHeaders(reportTemplate.fileName(data)), [REQUEST_ID_HEADER]: requestId },
    });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
