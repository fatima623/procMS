import Link from 'next/link';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { WorkOrderCreateForm } from './WorkOrderCreateForm';

export const metadata = { title: 'Create Work Order • Admin' };
export const dynamic = 'force-dynamic';

export default async function NewWorkOrderPage() {
  await requireSessionCtx();

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Create Work Order</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Issue maintenance or repair order (ProcMS v4.4.1 manual pp. 236–241).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn" href="/admin/work-orders">
          ← Back to work orders
        </Link>
      </div>

      <div className="card" style={{ padding: 24 }}>
        <WorkOrderCreateForm />
      </div>
    </div>
  );
}
