import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { prisma } from '@/infrastructure/db/prisma';
import { LedgerEntryForm } from './LedgerEntryForm';

export const metadata = { title: 'New Ledger Entry • Stores' };
export const dynamic = 'force-dynamic';

export default async function NewLedgerEntryPage() {
  await requireSessionCtx();
  const demands = await prisma.internalDemand.findMany({
    select: { id: true, demandNumber: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Record Ledger Entry</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Stock issuance or receipt transaction (ProcMS v4.4.1 manual pp. 230–231).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/stores/ledger">
          ← Back to ledger
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <LedgerEntryForm demands={demands} />
      </div>
    </div>
  );
}
