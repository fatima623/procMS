import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { RequisitionCreateForm } from './RequisitionCreateForm';

export const metadata = { title: 'Raise Vehicle Requisition • Transport' };
export const dynamic = 'force-dynamic';

export default async function NewRequisitionPage() {
  await requireSessionCtx();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Raise Vehicle Requisition</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Book an official vehicle from the transport pool (ProcMS v4.4.1 manual pp. 232–235).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/admin/transport/requisitions">
          ← Back to requisitions
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <RequisitionCreateForm />
      </div>
    </div>
  );
}
