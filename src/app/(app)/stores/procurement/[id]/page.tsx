import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { internalProcurementService } from '@/infrastructure/stores/InternalProcurementService';
import { ProcurementDetailClient } from './ProcurementDetailClient';

export const metadata = { title: 'Procurement Details • Stores' };
export const dynamic = 'force-dynamic';

export default async function ProcurementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireSessionCtx();
  const { id } = await params;

  let procurement;
  try {
    procurement = await internalProcurementService.get(id);
  } catch {
    notFound();
  }

  const availableFirms = await prisma.firm.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>{procurement.reference}</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Internal Procurement Workflow (ProcMS v4.4.1 manual pp. 221–229)
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/stores/procurement">
          ← Back to list
        </Link>
      </div>

      <ProcurementDetailClient
        procurement={procurement as any}
        availableFirms={availableFirms}
      />
    </div>
  );
}
