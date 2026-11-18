import Link from 'next/link';
import { prisma } from '@/infrastructure/db/prisma';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { DemandCreateForm } from './DemandCreateForm';

export const metadata = { title: 'Raise Internal Demand • Stores' };
export const dynamic = 'force-dynamic';

export default async function NewDemandPage() {
  await requireSessionCtx();
  const sections = await prisma.section.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  });

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Raise Internal Demand</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Request store items for a section (ProcMS v4.4.1 manual pp. 217–220).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/stores/demands">
          ← Back to demands
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <DemandCreateForm sections={sections} />
      </div>
    </div>
  );
}
