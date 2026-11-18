import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createEmployeeSchema } from '@/interfaces/http/schemas/hr';
import { employeeService } from '@/infrastructure/hr/EmployeeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const section  = url.searchParams.get('section') ?? undefined;
    const rawActive = url.searchParams.get('isActive');
    const isActive  = rawActive === 'true' ? true : rawActive === 'false' ? false : undefined;
    const data = await employeeService.list({ section, isActive });
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const body = createEmployeeSchema.parse(await req.json());
    const data = await employeeService.create(body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
