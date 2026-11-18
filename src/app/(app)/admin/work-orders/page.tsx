import Link from 'next/link';
import { WorkOrderStatus } from '@prisma/client';
import { requireSessionCtx } from '@/interfaces/ui/auth';
import { workOrderService } from '@/infrastructure/workorders/WorkOrderService';
import { StatusPill } from '@/interfaces/ui/components/StatusPill';
import { DateLabel } from '@/interfaces/ui/components/DateLabel';
import { Empty } from '@/interfaces/ui/components/Empty';
import { MoneyLabel } from '@/interfaces/ui/components/Money';
import { WorkOrderStatusActions } from './WorkOrderStatusActions';

export const metadata = { title: 'Work Orders • Admin' };
export const dynamic = 'force-dynamic';

function toneForStatus(status: WorkOrderStatus) {
  if (status === 'COMPLETED') return 'ok' as const;
  if (status === 'IN_PROGRESS') return 'info' as const;
  if (status === 'CANCELLED') return 'danger' as const;
  return 'warn' as const;
}

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireSessionCtx();
  const params = await searchParams;
  const statusFilter = params.status && Object.values(WorkOrderStatus).includes(params.status as WorkOrderStatus)
    ? (params.status as WorkOrderStatus)
    : undefined;

  const orders = await workOrderService.list(statusFilter ? { status: statusFilter } : undefined);

  return (
    <>
      <div className="row" style={{ marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Work Orders</h1>
          <p className="muted" style={{ margin: '4px 0 0 0' }}>
            Maintenance, repair, and facility works (ProcMS v4.4.1 manual pp. 236–241).
          </p>
        </div>
        <div className="grow" />
        <Link className="btn btn-primary" href="/admin/work-orders/new">
          + Create Work Order
        </Link>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 16 }}>
        <Link
          href="/admin/work-orders"
          className={`btn ${!statusFilter ? 'btn-primary' : ''}`}
          style={{ fontSize: 13, padding: '4px 10px' }}
        >
          All
        </Link>
        {Object.values(WorkOrderStatus).map((s) => (
          <Link
            key={s}
            href={`/admin/work-orders?status=${s}`}
            className={`btn ${statusFilter === s ? 'btn-primary' : ''}`}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            {s}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <Empty>No work orders found.</Empty>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>WO #</th>
              <th>Kind</th>
              <th>Subject</th>
              <th>Raised By</th>
              <th>Assigned To</th>
              <th>Date</th>
              <th>Cost</th>
              <th>Status</th>
              <th className="right">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="mono font-semibold">{o.workOrderNumber}</td>
                <td className="muted">{o.kind}</td>
                <td className="font-semibold">{o.subject}</td>
                <td>{o.raisedBy.displayName}</td>
                <td>{o.assignedTo || <span className="muted">Unassigned</span>}</td>
                <td><DateLabel iso={o.raisedOn} /></td>
                <td className="mono">
                  {o.costMinor ? (
                    <MoneyLabel amountMinor={o.costMinor} currency={o.currency ?? 'PKR'} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>
                  <StatusPill tone={toneForStatus(o.status)}>{o.status}</StatusPill>
                </td>
                <td className="right">
                  <WorkOrderStatusActions
                    workOrderId={o.id}
                    status={o.status}
                    assignedTo={o.assignedTo}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
