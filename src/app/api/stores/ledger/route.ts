import { NextResponse, type NextRequest } from 'next/server';
import { InventoryLedgerKind } from '@prisma/client';
import { requireAuth } from '@/interfaces/http/middleware/authGuard';
import { toHttpResponse } from '@/interfaces/http/errors';
import { REQUEST_ID_HEADER, requestIdOf } from '@/interfaces/http/requestId';
import { createInventoryLedgerEntrySchema } from '@/interfaces/http/schemas/inventoryLedger';
import { inventoryLedgerService } from '@/infrastructure/stores/InventoryLedgerService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    await requireAuth(req);
    const url = new URL(req.url);
    const rawKind = url.searchParams.get('kind');
    const kind = rawKind && Object.values(InventoryLedgerKind).includes(rawKind as InventoryLedgerKind)
      ? (rawKind as InventoryLedgerKind)
      : undefined;

    const data = await inventoryLedgerService.list(kind ? { kind } : undefined);
    return NextResponse.json({ data }, { headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rid = requestIdOf(req);
  try {
    const ctx = await requireAuth(req);
    const body = createInventoryLedgerEntrySchema.parse(await req.json());
    const data = await inventoryLedgerService.create(ctx.userId, body);
    return NextResponse.json({ data }, { status: 201, headers: { [REQUEST_ID_HEADER]: rid } });
  } catch (err) {
    return toHttpResponse(err, rid);
  }
}
