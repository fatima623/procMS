import { NextResponse, type NextRequest } from 'next/server';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { bulkAttendanceSchema } from '@/interfaces/http/schemas/hr';
import { employeeService } from '@/infrastructure/hr/EmployeeService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const dateParam = url.searchParams.get('date') ?? new Date().toISOString().slice(0, 10);
    const section = url.searchParams.get('section') ?? undefined;
    const date = new Date(dateParam);
    const data = await employeeService.listAttendance(date, section);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = bulkAttendanceSchema.parse(await req.json());
    const data = await employeeService.bulkMarkAttendance(ctx.userId, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
