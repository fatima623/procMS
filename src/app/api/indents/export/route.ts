import { type NextRequest } from 'next/server';
import { Role, IndentStatus } from '@prisma/client';

import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { listVisibleIndents } from '@/interfaces/ui/views/IndentViews';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VALID_STATUSES: ReadonlySet<string> = new Set(Object.values(IndentStatus));

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const url = req.nextUrl;
    const statusRaw = url.searchParams.get('status') ?? undefined;
    const status = statusRaw && VALID_STATUSES.has(statusRaw) ? (statusRaw as IndentStatus) : undefined;
    const search = url.searchParams.get('q') ?? undefined;

    // Export up to 10 000 rows per download. For larger exports we'd stream;
    // this is adequate for a quarterly report.
    const page = await listVisibleIndents(ctx, {
      pageSize: 10_000,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    });

    const headers = [
      'indentNumber', 'controlNumber', 'subject', 'status', 'priority',
      'estimatedValue', 'currency', 'submittedAt', 'createdAt',
    ];
    const rows = page.items.map((i) => [
      i.indentNumber,
      i.controlNumber ?? '',
      i.subject,
      i.status,
      i.priority,
      formatMoneyPlain(i.estimatedValueMinor),
      i.currency,
      i.submittedAt ?? '',
      i.createdAt,
    ]);
    const csv = [headers, ...rows].map(toCsvLine).join('\r\n');

    const scope = ctx.roles.includes(Role.ADMIN) ? 'all' : 'mine';
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `indents_${scope}_${timestamp}.csv`;

    return new Response('﻿' + csv, {   // UTF-8 BOM so Excel renders UTF-8 correctly
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
        [REQUEST_ID_HEADER]: requestId,
      },
    });
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

function toCsvLine(values: readonly string[]): string {
  return values.map(escapeCsvField).join(',');
}

function escapeCsvField(v: string): string {
  if (v === '') return '';
  // Quote whenever the value contains a comma, quote, newline, or leading
  // formula-injection character.
  const needsQuote = /[",\r\n]/.test(v) || /^[=+\-@]/.test(v);
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;      // defuse CSV formula injection
  if (needsQuote) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function formatMoneyPlain(amountMinor: string): string {
  const minor = BigInt(amountMinor);
  const abs = minor < 0n ? -minor : minor;
  const intPart = (abs / 10_000n).toString();
  const fracPart = (abs % 10_000n).toString().padStart(4, '0').slice(0, 2);
  return `${minor < 0n ? '-' : ''}${intPart}.${fracPart}`;
}
