import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { ProcurementCreateForm } from './ProcurementCreateForm';

export const metadata = { title: 'New Internal Procurement • Stores' };
export const dynamic = 'force-dynamic';

export default async function NewProcurementPage() {
  await requireSessionCtx();

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>New Internal Procurement</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Initiate small purchase workflow (ProcMS v4.4.1 manual pp. 221–229).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/stores/procurement">
          ← Back to list
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <ProcurementCreateForm />
      </div>
    </div>
  );
}
