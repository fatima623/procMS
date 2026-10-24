import { NextResponse, type NextRequest } from 'next/server';
import { Role, type IndentStatus } from '@prisma/client';

import { getContainer } from '@/infrastructure/composition/container';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import {
  createIndentSchema,
  listIndentsQuerySchema,
} from '@/interfaces/http/schemas/indent';
import { rootLogger } from '@/infrastructure/logging/pinoLogger';

// Prisma + bcrypt + pino are Node-only.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  const log = rootLogger.child({ requestId, route: 'POST /api/indents' });
  try {
    const ctx = await requireAuth(req, [Role.INDENTER, Role.ADMIN]);
    const body = createIndentSchema.parse(await req.json());

    const result = await getContainer().createIndent.execute(ctx, body);
    log.info({ indentId: result.indentId }, 'indent created');
    return NextResponse.json(
      { data: result },
      { status: 201, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const parsed = listIndentsQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries()),
    );
    const statuses = parsed.status
      ? (parsed.status.split(',').map((s) => s.trim()).filter(Boolean) as IndentStatus[])
      : undefined;

    const page = await getContainer().listIndents.execute(ctx, {
      page: parsed.page,
      pageSize: parsed.pageSize,
      search: parsed.search,
      indenterId: parsed.indenterId,
      sectionId: parsed.sectionId,
      fiscalYearId: parsed.fiscalYearId,
      statuses,
    });

    return NextResponse.json(
      {
        data: {
          items: page.items.map((i) => ({
            id: i.id,
            indentNumber: i.indentNumber,
            controlNumber: i.controlNumber,
            subject: i.subject,
            status: i.status,
            type: i.type,
            priority: i.priority,
            estimatedValue: i.estimatedValue.toJSON(),
            submittedAt: i.submittedAt?.toISOString() ?? null,
            createdAt: i.createdAt.toISOString(),
          })),
          page: page.page,
          pageSize: page.pageSize,
          total: page.total,
        },
      },
      { status: 200, headers: { [REQUEST_ID_HEADER]: requestId } },
    );
  } catch (err) {
    return toHttpResponse(err, requestId);
  }
}
